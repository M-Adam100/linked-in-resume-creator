import { create } from 'zustand';

import { generateId } from '../lib/ids';
import { logger, setDebugLogging } from '../lib/logger';
import {
  addEducation,
  addExperience,
  createEmptyResume,
  normalizeLinkedInProfile,
  parsePastedProfileText,
  reorderExperience,
} from '../lib/resumeBuilder';
import {
  DEFAULT_SETTINGS,
  appendVersion,
  clearAllData,
  createDocument,
  flushState,
  loadState,
  saveState,
  subscribeToState,
  versionsForDocument,
} from '../lib/storage';
import { normalizeTheme } from '../lib/templates';
import type {
  AppSettings,
  LinkedInProfile,
  PersistedState,
  Resume,
  ResumeDocument,
  ThemeSettings,
  VersionSnapshot,
} from '../lib/types';

/** Auto-snapshots are throttled so history stays useful rather than noisy. */
const AUTO_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

/** Placeholder names that a capture is allowed to overwrite. */
const DEFAULT_LABELS = new Set(['My resume', 'Untitled resume']);

export interface ResumeState {
  documents: ResumeDocument[];
  activeDocumentId: string | null;
  versions: VersionSnapshot[];
  settings: AppSettings;

  hydrated: boolean;
  isCapturing: boolean;
  error: string | null;
  notice: string | null;

  hydrate: () => Promise<void>;
  flush: () => Promise<void>;

  setError: (error: string | null) => void;
  setNotice: (notice: string | null) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setCapturing: (isCapturing: boolean) => void;

  // Documents
  createNewDocument: (label?: string) => string;
  duplicateDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, label: string) => void;
  selectDocument: (id: string) => void;

  // Content
  updateResume: (updates: Partial<Resume>) => void;
  updateContact: (updates: Partial<Resume['contact']>) => void;
  importLinkedInProfile: (profile: LinkedInProfile) => void;
  importPastedText: (text: string) => void;
  importResume: (resume: Resume, theme?: ThemeSettings) => void;
  clearActiveResume: () => void;
  resetEverything: () => Promise<void>;

  updateTheme: (updates: Partial<ThemeSettings>) => void;

  // Experience
  updateExperience: (
    id: string,
    updates: Partial<Resume['experience'][number]>
  ) => void;
  removeExperience: (id: string) => void;
  addExperienceEntry: () => void;
  moveExperience: (fromIndex: number, toIndex: number) => void;
  updateBullet: (expId: string, bulletIndex: number, value: string) => void;
  addBullet: (expId: string) => void;
  removeBullet: (expId: string, bulletIndex: number) => void;
  moveBullet: (expId: string, fromIndex: number, toIndex: number) => void;

  // Education
  updateEducation: (
    id: string,
    updates: Partial<Resume['education'][number]>
  ) => void;
  removeEducation: (id: string) => void;
  addEducationEntry: () => void;

  // Skills
  updateSkills: (skills: string[]) => void;
  addSkill: (skill: string) => void;
  removeSkill: (index: number) => void;

  // History
  saveVersion: (label?: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
}

/** Set while applying a change that arrived from another extension context. */
let applyingRemoteChange = false;
let lastAutoSnapshotAt = 0;

function toPersisted(state: ResumeState): PersistedState {
  return {
    schemaVersion: 2,
    documents: state.documents,
    activeDocumentId: state.activeDocumentId,
    versions: state.versions,
    settings: state.settings,
  };
}

export const selectActiveDocument = (
  state: Pick<ResumeState, 'documents' | 'activeDocumentId'>
): ResumeDocument | null =>
  state.documents.find((doc) => doc.id === state.activeDocumentId) ??
  state.documents[0] ??
  null;

export const useResumeStore = create<ResumeState>((set, get) => {
  /** Applies a state patch and persists the result unless it came from storage. */
  const commit = (patch: Partial<ResumeState>) => {
    set(patch);
    if (!applyingRemoteChange) {
      saveState(toPersisted(get()));
    }
  };

  /** Updates the active document in place, bumping its timestamp. */
  const mutateDocument = (updater: (doc: ResumeDocument) => ResumeDocument) => {
    const active = selectActiveDocument(get());
    if (!active) return;

    const updated = { ...updater(active), updatedAt: Date.now() };
    commit({
      documents: get().documents.map((doc) =>
        doc.id === active.id ? updated : doc
      ),
    });
  };

  const mutateResume = (updater: (resume: Resume) => Resume) => {
    mutateDocument((doc) => ({ ...doc, resume: updater(doc.resume) }));
  };

  /**
   * Captures a history entry before a destructive change, and occasionally
   * during normal editing so users can walk back mistakes.
   */
  const snapshot = (label: string, force = true) => {
    const active = selectActiveDocument(get());
    if (!active) return;

    const now = Date.now();
    if (!force && now - lastAutoSnapshotAt < AUTO_SNAPSHOT_INTERVAL_MS) return;
    lastAutoSnapshotAt = now;

    set({
      versions: appendVersion(get().versions, active.id, active.resume, label),
    });
  };

  return {
    documents: [],
    activeDocumentId: null,
    versions: [],
    settings: { ...DEFAULT_SETTINGS },

    hydrated: false,
    isCapturing: false,
    error: null,
    notice: null,

    hydrate: async () => {
      const state = await loadState();
      setDebugLogging(state.settings.debugLogging);

      set({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId,
        versions: state.versions,
        settings: state.settings,
        hydrated: true,
      });

      subscribeToState((remote) => {
        applyingRemoteChange = true;
        try {
          set({
            documents: remote.documents,
            activeDocumentId: remote.activeDocumentId,
            versions: remote.versions,
            settings: remote.settings,
          });
        } finally {
          applyingRemoteChange = false;
        }
      });
    },

    flush: () => flushState(),

    setError: (error) => set({ error }),
    setNotice: (notice) => set({ notice }),
    setCapturing: (isCapturing) => set({ isCapturing }),

    updateSettings: (updates) => {
      const settings = { ...get().settings, ...updates };
      setDebugLogging(settings.debugLogging);
      commit({ settings });
    },

    /* ----------------------------- documents ---------------------------- */

    createNewDocument: (label = 'Untitled resume') => {
      const doc = createDocument(label);
      commit({
        documents: [...get().documents, doc],
        activeDocumentId: doc.id,
      });
      return doc.id;
    },

    duplicateDocument: (id) => {
      const source = get().documents.find((doc) => doc.id === id);
      if (!source) return;

      const copy: ResumeDocument = {
        ...source,
        id: generateId(),
        label: `${source.label} (copy)`,
        resume: structuredCloneSafe(source.resume),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      commit({
        documents: [...get().documents, copy],
        activeDocumentId: copy.id,
      });
    },

    deleteDocument: (id) => {
      const remaining = get().documents.filter((doc) => doc.id !== id);
      const documents =
        remaining.length > 0 ? remaining : [createDocument('My resume')];

      commit({
        documents,
        activeDocumentId:
          get().activeDocumentId === id
            ? documents[0].id
            : get().activeDocumentId,
        versions: get().versions.filter((v) => v.documentId !== id),
      });
    },

    renameDocument: (id, label) => {
      commit({
        documents: get().documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                label: label || 'Untitled resume',
                updatedAt: Date.now(),
              }
            : doc
        ),
      });
    },

    selectDocument: (id) => {
      if (!get().documents.some((doc) => doc.id === id)) return;
      commit({ activeDocumentId: id });
    },

    /* ------------------------------ content ----------------------------- */

    updateResume: (updates) => {
      snapshot('Before edit', false);
      mutateResume((resume) => ({ ...resume, ...updates }));
    },

    updateContact: (updates) => {
      mutateResume((resume) => ({
        ...resume,
        contact: { ...resume.contact, ...updates },
      }));
    },

    importLinkedInProfile: (profile) => {
      snapshot('Before LinkedIn import');
      const resume = normalizeLinkedInProfile(profile);
      mutateDocument((doc) => ({
        ...doc,
        label:
          resume.name && DEFAULT_LABELS.has(doc.label)
            ? `${resume.name}'s resume`
            : doc.label,
        resume,
      }));
      set({ error: null, notice: 'Imported from LinkedIn.' });
    },

    importPastedText: (text) => {
      snapshot('Before paste import');
      const resume = normalizeLinkedInProfile(parsePastedProfileText(text));
      mutateResume(() => resume);
      set({ error: null, notice: 'Imported pasted profile.' });
    },

    importResume: (resume, theme) => {
      snapshot('Before file import');
      mutateDocument((doc) => ({
        ...doc,
        resume,
        theme: theme ? normalizeTheme(theme) : doc.theme,
      }));
      set({ error: null, notice: 'Resume imported.' });
    },

    clearActiveResume: () => {
      snapshot('Before clearing');
      mutateResume(() => createEmptyResume());
    },

    resetEverything: async () => {
      await clearAllData();
      const doc = createDocument('My resume');
      applyingRemoteChange = true;
      try {
        set({
          documents: [doc],
          activeDocumentId: doc.id,
          versions: [],
          settings: { ...DEFAULT_SETTINGS },
          error: null,
          notice: 'All local data removed.',
        });
      } finally {
        applyingRemoteChange = false;
      }
      saveState(toPersisted(get()));
      await flushState();
    },

    updateTheme: (updates) => {
      mutateDocument((doc) => ({
        ...doc,
        theme: normalizeTheme({ ...doc.theme, ...updates }),
      }));
    },

    /* ---------------------------- experience ---------------------------- */

    updateExperience: (id, updates) => {
      snapshot('Before edit', false);
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.map((exp) =>
          exp.id === id ? { ...exp, ...updates } : exp
        ),
      }));
    },

    removeExperience: (id) => {
      snapshot('Before removing a role');
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.filter((exp) => exp.id !== id),
      }));
    },

    addExperienceEntry: () => mutateResume(addExperienceToResume),

    moveExperience: (fromIndex, toIndex) => {
      mutateResume((resume) => reorderExperience(resume, fromIndex, toIndex));
    },

    updateBullet: (expId, bulletIndex, value) => {
      snapshot('Before edit', false);
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.map((exp) => {
          if (exp.id !== expId) return exp;
          const bullets = [...exp.bullets];
          bullets[bulletIndex] = value;
          return { ...exp, bullets };
        }),
      }));
    },

    addBullet: (expId) => {
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.map((exp) =>
          exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
        ),
      }));
    },

    removeBullet: (expId, bulletIndex) => {
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.map((exp) =>
          exp.id === expId
            ? {
                ...exp,
                bullets: exp.bullets.filter((_, i) => i !== bulletIndex),
              }
            : exp
        ),
      }));
    },

    moveBullet: (expId, fromIndex, toIndex) => {
      mutateResume((resume) => ({
        ...resume,
        experience: resume.experience.map((exp) => {
          if (exp.id !== expId) return exp;
          if (
            fromIndex === toIndex ||
            toIndex < 0 ||
            toIndex >= exp.bullets.length
          ) {
            return exp;
          }
          const bullets = [...exp.bullets];
          const [moved] = bullets.splice(fromIndex, 1);
          bullets.splice(toIndex, 0, moved);
          return { ...exp, bullets };
        }),
      }));
    },

    /* ----------------------------- education ---------------------------- */

    updateEducation: (id, updates) => {
      snapshot('Before edit', false);
      mutateResume((resume) => ({
        ...resume,
        education: resume.education.map((edu) =>
          edu.id === id ? { ...edu, ...updates } : edu
        ),
      }));
    },

    removeEducation: (id) => {
      mutateResume((resume) => ({
        ...resume,
        education: resume.education.filter((edu) => edu.id !== id),
      }));
    },

    addEducationEntry: () => mutateResume(addEducationToResume),

    /* ------------------------------ skills ------------------------------ */

    updateSkills: (skills) => mutateResume((resume) => ({ ...resume, skills })),

    addSkill: (skill) => {
      const trimmed = skill.trim();
      if (!trimmed) return;
      mutateResume((resume) =>
        resume.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())
          ? resume
          : { ...resume, skills: [...resume.skills, trimmed] }
      );
    },

    removeSkill: (index) => {
      mutateResume((resume) => ({
        ...resume,
        skills: resume.skills.filter((_, i) => i !== index),
      }));
    },

    /* ------------------------------ history ----------------------------- */

    saveVersion: (label = 'Manual save') => {
      const active = selectActiveDocument(get());
      if (!active) return;
      commit({
        versions: appendVersion(
          get().versions,
          active.id,
          active.resume,
          label
        ),
      });
      set({ notice: 'Version saved.' });
    },

    restoreVersion: (versionId) => {
      const version = get().versions.find((v) => v.id === versionId);
      if (!version) return;

      snapshot('Before restore');
      mutateResume(() => version.resume);
      set({ notice: 'Version restored.' });
      logger.info('Restored version', versionId);
    },

    deleteVersion: (versionId) => {
      commit({ versions: get().versions.filter((v) => v.id !== versionId) });
    },
  };
});

function addExperienceToResume(resume: Resume): Resume {
  return addExperience(resume);
}

function addEducationToResume(resume: Resume): Resume {
  return addEducation(resume);
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/* -------------------------------- hooks -------------------------------- */

export function useActiveDocument(): ResumeDocument | null {
  return useResumeStore((state) => selectActiveDocument(state));
}

const EMPTY_RESUME = createEmptyResume();
const FALLBACK_THEME = normalizeTheme();

export function useActiveResume(): Resume {
  const doc = useActiveDocument();
  return doc?.resume ?? EMPTY_RESUME;
}

export function useActiveTheme(): ThemeSettings {
  const doc = useActiveDocument();
  return doc?.theme ?? FALLBACK_THEME;
}

export function useActiveVersions(): VersionSnapshot[] {
  const versions = useResumeStore((state) => state.versions);
  const doc = useActiveDocument();
  return doc ? versionsForDocument(versions, doc.id) : [];
}
