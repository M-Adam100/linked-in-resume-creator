import { create } from 'zustand';
import {
  createEmptyResume,
  normalizeLinkedInProfile,
  parsePastedProfileText,
  reorderExperience,
  addExperience,
  addEducation,
} from '../lib/resumeBuilder';
import { loadResume, saveResume } from '../lib/storage';
import type { AppScreen, LinkedInProfile, Resume } from '../lib/types';

interface ResumeState {
  resume: Resume;
  screen: AppScreen;
  isEditMode: boolean;
  isLoading: boolean;
  error: string | null;
  isPasteModalOpen: boolean;

  setScreen: (screen: AppScreen) => void;
  setEditMode: (edit: boolean) => void;
  setPasteModalOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  loadFromStorage: () => Promise<void>;
  updateResume: (updates: Partial<Resume>) => void;
  importLinkedInProfile: (profile: LinkedInProfile) => void;
  importPastedText: (text: string) => void;
  startManualBuilder: () => void;
  resetResume: () => void;

  updateExperience: (
    id: string,
    updates: Partial<Resume['experience'][0]>
  ) => void;
  removeExperience: (id: string) => void;
  addExperienceEntry: () => void;
  moveExperience: (fromIndex: number, toIndex: number) => void;
  updateBullet: (
    expId: string,
    bulletIndex: number,
    value: string
  ) => void;
  addBullet: (expId: string) => void;
  removeBullet: (expId: string, bulletIndex: number) => void;

  updateEducation: (
    id: string,
    updates: Partial<Resume['education'][0]>
  ) => void;
  removeEducation: (id: string) => void;
  addEducationEntry: () => void;

  updateSkills: (skills: string[]) => void;
  addSkill: (skill: string) => void;
  removeSkill: (index: number) => void;
}

async function persist(resume: Resume): Promise<void> {
  await saveResume(resume);
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resume: createEmptyResume(),
  screen: 'home',
  isEditMode: true,
  isLoading: false,
  error: null,
  isPasteModalOpen: false,

  setScreen: (screen) => set({ screen }),
  setEditMode: (isEditMode) => set({ isEditMode }),
  setPasteModalOpen: (isPasteModalOpen) => set({ isPasteModalOpen }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  loadFromStorage: async () => {
    const saved = await loadResume();
    if (saved) {
      set({ resume: saved });
    }
  },

  updateResume: (updates) => {
    const resume = { ...get().resume, ...updates };
    set({ resume });
    void persist(resume);
  },

  importLinkedInProfile: (profile) => {
    const resume = normalizeLinkedInProfile(profile);
    set({ resume, screen: 'editor', error: null });
    void persist(resume);
  },

  importPastedText: (text) => {
    const profile = parsePastedProfileText(text);
    const resume = normalizeLinkedInProfile(profile);
    set({ resume, screen: 'editor', isPasteModalOpen: false, error: null });
    void persist(resume);
  },

  startManualBuilder: () => {
    const resume = createEmptyResume();
    set({ resume, screen: 'editor', error: null });
    void persist(resume);
  },

  resetResume: () => {
    const resume = createEmptyResume();
    set({ resume, screen: 'home', error: null });
    void persist(resume);
  },

  updateExperience: (id, updates) => {
    const resume = {
      ...get().resume,
      experience: get().resume.experience.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    };
    set({ resume });
    void persist(resume);
  },

  removeExperience: (id) => {
    const resume = {
      ...get().resume,
      experience: get().resume.experience.filter((exp) => exp.id !== id),
    };
    set({ resume });
    void persist(resume);
  },

  addExperienceEntry: () => {
    const resume = addExperience(get().resume);
    set({ resume });
    void persist(resume);
  },

  moveExperience: (fromIndex, toIndex) => {
    const resume = reorderExperience(get().resume, fromIndex, toIndex);
    set({ resume });
    void persist(resume);
  },

  updateBullet: (expId, bulletIndex, value) => {
    const resume = {
      ...get().resume,
      experience: get().resume.experience.map((exp) => {
        if (exp.id !== expId) return exp;
        const bullets = [...exp.bullets];
        bullets[bulletIndex] = value;
        return { ...exp, bullets };
      }),
    };
    set({ resume });
    void persist(resume);
  },

  addBullet: (expId) => {
    const resume = {
      ...get().resume,
      experience: get().resume.experience.map((exp) =>
        exp.id === expId ? { ...exp, bullets: [...exp.bullets, ''] } : exp
      ),
    };
    set({ resume });
    void persist(resume);
  },

  removeBullet: (expId, bulletIndex) => {
    const resume = {
      ...get().resume,
      experience: get().resume.experience.map((exp) => {
        if (exp.id !== expId) return exp;
        return {
          ...exp,
          bullets: exp.bullets.filter((_, i) => i !== bulletIndex),
        };
      }),
    };
    set({ resume });
    void persist(resume);
  },

  updateEducation: (id, updates) => {
    const resume = {
      ...get().resume,
      education: get().resume.education.map((edu) =>
        edu.id === id ? { ...edu, ...updates } : edu
      ),
    };
    set({ resume });
    void persist(resume);
  },

  removeEducation: (id) => {
    const resume = {
      ...get().resume,
      education: get().resume.education.filter((edu) => edu.id !== id),
    };
    set({ resume });
    void persist(resume);
  },

  addEducationEntry: () => {
    const resume = addEducation(get().resume);
    set({ resume });
    void persist(resume);
  },

  updateSkills: (skills) => {
    const resume = { ...get().resume, skills };
    set({ resume });
    void persist(resume);
  },

  addSkill: (skill) => {
    const trimmed = skill.trim();
    if (!trimmed || get().resume.skills.includes(trimmed)) return;
    const resume = {
      ...get().resume,
      skills: [...get().resume.skills, trimmed],
    };
    set({ resume });
    void persist(resume);
  },

  removeSkill: (index) => {
    const resume = {
      ...get().resume,
      skills: get().resume.skills.filter((_, i) => i !== index),
    };
    set({ resume });
    void persist(resume);
  },
}));
