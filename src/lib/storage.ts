import { generateId } from './ids';
import { logger } from './logger';
import { asString, isEmptyResume, normalizeResume } from './normalize';
import { createEmptyResume } from './resumeBuilder';
import { normalizeTheme } from './templates';
import type {
  AppSettings,
  PersistedState,
  Resume,
  ResumeDocument,
  ThemeSettings,
  VersionSnapshot,
} from './types';

export const STORAGE_KEY = 'resumeforge:state';
/** Key written by the 1.0 MVP, which stored a single bare resume. */
const LEGACY_RESUME_KEY = 'resumeforge_resume';

export const SCHEMA_VERSION = 2;

const MAX_VERSIONS_PER_DOCUMENT = 20;
const MAX_VERSIONS_TOTAL = 120;
const WRITE_DEBOUNCE_MS = 400;

export const DEFAULT_SETTINGS: AppSettings = {
  advancedCapture: true,
  debugLogging: false,
};

export function createDocument(
  label = 'Untitled resume',
  resume: Resume = createEmptyResume(),
  theme?: Partial<ThemeSettings>
): ResumeDocument {
  const now = Date.now();
  return {
    id: generateId(),
    label,
    resume,
    theme: normalizeTheme(theme),
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialState(): PersistedState {
  const doc = createDocument('My resume');
  return {
    schemaVersion: SCHEMA_VERSION,
    documents: [doc],
    activeDocumentId: doc.id,
    versions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeDocument(raw: unknown): ResumeDocument {
  const source = (raw ?? {}) as Record<string, unknown>;
  const now = Date.now();

  return {
    id: asString(source.id) || generateId(),
    label: asString(source.label) || 'Untitled resume',
    resume: normalizeResume(source.resume),
    theme: normalizeTheme(source.theme ?? {}),
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : now,
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : now,
  };
}

function normalizeSettings(raw: unknown): AppSettings {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    advancedCapture:
      typeof source.advancedCapture === 'boolean'
        ? source.advancedCapture
        : DEFAULT_SETTINGS.advancedCapture,
    debugLogging:
      typeof source.debugLogging === 'boolean'
        ? source.debugLogging
        : DEFAULT_SETTINGS.debugLogging,
  };
}

function normalizeVersions(raw: unknown): VersionSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const source = (item ?? {}) as Record<string, unknown>;
      return {
        id: asString(source.id) || generateId(),
        documentId: asString(source.documentId),
        label: asString(source.label) || 'Snapshot',
        resume: normalizeResume(source.resume),
        createdAt:
          typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
      };
    })
    .filter((snapshot) => snapshot.documentId);
}

export function normalizeState(raw: unknown): PersistedState {
  const source = (raw ?? {}) as Record<string, unknown>;

  const documents = Array.isArray(source.documents)
    ? source.documents.map(normalizeDocument)
    : [];

  if (documents.length === 0) {
    return createInitialState();
  }

  const activeId = asString(source.activeDocumentId);
  const activeDocumentId = documents.some((doc) => doc.id === activeId)
    ? activeId
    : documents[0].id;

  return {
    schemaVersion: SCHEMA_VERSION,
    documents,
    activeDocumentId,
    versions: normalizeVersions(source.versions),
    settings: normalizeSettings(source.settings),
  };
}

/* ------------------------------------------------------------------ *
 * Migration
 * ------------------------------------------------------------------ */

/**
 * v1 stored a single resume under `resumeforge_resume` with no contact block
 * and no per-experience location. Wrap it in a document and drop the old key.
 */
export function migrateLegacyResume(legacyResume: unknown): PersistedState {
  const resume = normalizeResume(legacyResume);
  const label = resume.name ? `${resume.name}'s resume` : 'My resume';
  const doc = createDocument(label, resume);

  return {
    schemaVersion: SCHEMA_VERSION,
    documents: [doc],
    activeDocumentId: doc.id,
    versions: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/* ------------------------------------------------------------------ *
 * Read / write
 * ------------------------------------------------------------------ */

export async function loadState(): Promise<PersistedState> {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEY,
      LEGACY_RESUME_KEY,
    ]);

    const current = stored[STORAGE_KEY];
    if (current) {
      return normalizeState(current);
    }

    const legacy = stored[LEGACY_RESUME_KEY];
    if (legacy) {
      const migrated = migrateLegacyResume(legacy);
      logger.info('Migrated v1 resume into schema v2');
      await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
      await chrome.storage.local.remove(LEGACY_RESUME_KEY);
      return migrated;
    }

    const initial = createInitialState();
    await chrome.storage.local.set({ [STORAGE_KEY]: initial });
    return initial;
  } catch (error) {
    logger.error('Failed to load state, starting fresh', error);
    return createInitialState();
  }
}

let pendingState: PersistedState | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> = Promise.resolve();

async function writeNow(state: PersistedState): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  } catch (error) {
    logger.error('Failed to persist state', error);
  }
}

/**
 * Editing a resume fires a state update on every keystroke, so writes are
 * coalesced rather than hitting chrome.storage each time.
 */
export function saveState(state: PersistedState): void {
  pendingState = state;

  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const toWrite = pendingState;
    pendingState = null;
    if (toWrite) inFlight = writeNow(toWrite);
  }, WRITE_DEBOUNCE_MS);
}

/** Flushes any debounced write. Call before the context can be torn down. */
export async function flushState(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  const toWrite = pendingState;
  pendingState = null;
  if (toWrite) inFlight = writeNow(toWrite);
  await inFlight;
}

export async function clearAllData(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  pendingState = null;
  await chrome.storage.local.remove([STORAGE_KEY, LEGACY_RESUME_KEY]);
}

/**
 * Keeps the popup and the editor tab in sync — both read the same key, so a
 * change in one context is picked up by the other.
 */
export function subscribeToState(
  onChange: (state: PersistedState) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local') return;
    const change = changes[STORAGE_KEY];
    if (!change?.newValue) return;
    onChange(normalizeState(change.newValue));
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/* ------------------------------------------------------------------ *
 * Version history
 * ------------------------------------------------------------------ */

export function appendVersion(
  versions: VersionSnapshot[],
  documentId: string,
  resume: Resume,
  label: string
): VersionSnapshot[] {
  if (isEmptyResume(resume)) return versions;

  const snapshot: VersionSnapshot = {
    id: generateId(),
    documentId,
    label,
    resume,
    createdAt: Date.now(),
  };

  const forDocument = [
    snapshot,
    ...versions.filter((v) => v.documentId === documentId),
  ].slice(0, MAX_VERSIONS_PER_DOCUMENT);
  const others = versions.filter((v) => v.documentId !== documentId);

  return [...forDocument, ...others]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_VERSIONS_TOTAL);
}

export function versionsForDocument(
  versions: VersionSnapshot[],
  documentId: string
): VersionSnapshot[] {
  return versions
    .filter((v) => v.documentId === documentId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
