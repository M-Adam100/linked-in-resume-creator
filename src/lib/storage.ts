import type { Resume } from './types';

const STORAGE_KEY = 'resumeforge_resume';

export async function loadResume(): Promise<Resume | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data = result[STORAGE_KEY];
  if (!data) return null;
  return data as Resume;
}

export async function saveResume(resume: Resume): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: resume });
}

export async function clearResume(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
