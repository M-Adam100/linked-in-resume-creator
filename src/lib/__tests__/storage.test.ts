import { beforeEach, describe, expect, it } from 'vitest';

import { resetChromeMock } from '../../test/chromeMock';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  appendVersion,
  createDocument,
  flushState,
  loadState,
  migrateLegacyResume,
  normalizeState,
  saveState,
  versionsForDocument,
} from '../storage';
import { createEmptyResume } from '../resumeBuilder';
import type { Resume } from '../types';

const LEGACY_KEY = 'resumeforge_resume';

function resumeWithContent(name = 'Ada'): Resume {
  return {
    ...createEmptyResume(),
    name,
    experience: [
      {
        id: 'exp-1',
        title: 'Engineer',
        company: 'Acme',
        location: '',
        duration: '2020 - 2022',
        bullets: ['Shipped the API'],
      },
    ],
  };
}

beforeEach(() => {
  resetChromeMock();
});

describe('loadState', () => {
  it('seeds a first document on a fresh install', async () => {
    const state = await loadState();

    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.documents).toHaveLength(1);
    expect(state.activeDocumentId).toBe(state.documents[0].id);

    const stored = await chrome.storage.local.get(STORAGE_KEY);
    expect(stored[STORAGE_KEY]).toBeTruthy();
  });

  it('migrates a v1 resume and removes the old key', async () => {
    await chrome.storage.local.set({
      [LEGACY_KEY]: {
        name: 'Ada Lovelace',
        headline: 'Engineer',
        summary: 'Bio',
        experience: [
          {
            id: 'legacy-1',
            title: 'Engineer',
            company: 'Acme',
            duration: '2020',
            bullets: ['Did the thing'],
          },
        ],
        education: [],
        skills: ['Go'],
      },
    });

    const state = await loadState();

    expect(state.documents).toHaveLength(1);
    expect(state.documents[0].resume.name).toBe('Ada Lovelace');
    expect(state.documents[0].label).toBe("Ada Lovelace's resume");
    // v1 had no contact block or per-role location.
    expect(state.documents[0].resume.contact).toEqual({
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
    });
    expect(state.documents[0].resume.experience[0].location).toBe('');

    const stored = await chrome.storage.local.get([STORAGE_KEY, LEGACY_KEY]);
    expect(stored[STORAGE_KEY]).toBeTruthy();
    expect(stored[LEGACY_KEY]).toBeUndefined();
  });

  it('reads back a state it wrote', async () => {
    const doc = createDocument('Backend roles', resumeWithContent());
    saveState({
      schemaVersion: SCHEMA_VERSION,
      documents: [doc],
      activeDocumentId: doc.id,
      versions: [],
      settings: { advancedCapture: false, debugLogging: true },
    });
    await flushState();

    const state = await loadState();
    expect(state.documents[0].label).toBe('Backend roles');
    expect(state.settings).toEqual({
      advancedCapture: false,
      debugLogging: true,
    });
  });
});

describe('saveState', () => {
  it('coalesces rapid writes into a single stored value', async () => {
    const doc = createDocument('Draft');

    for (const name of ['A', 'Ab', 'Abc']) {
      saveState({
        schemaVersion: SCHEMA_VERSION,
        documents: [{ ...doc, resume: { ...doc.resume, name } }],
        activeDocumentId: doc.id,
        versions: [],
        settings: { advancedCapture: true, debugLogging: false },
      });
    }

    await flushState();

    const state = await loadState();
    expect(state.documents[0].resume.name).toBe('Abc');
  });
});

describe('normalizeState', () => {
  it('replaces unusable data with a fresh state', () => {
    expect(normalizeState(null).documents).toHaveLength(1);
    expect(normalizeState({ documents: 'nope' }).documents).toHaveLength(1);
  });

  it('repairs a dangling active document id', () => {
    const doc = createDocument('Only');
    const state = normalizeState({
      documents: [doc],
      activeDocumentId: 'missing',
    });

    expect(state.activeDocumentId).toBe(doc.id);
  });

  it('coerces malformed fields instead of throwing', () => {
    const state = normalizeState({
      documents: [
        {
          id: 'doc-1',
          label: 42,
          resume: { name: null, skills: ['Go', 7], experience: 'nope' },
          theme: { templateId: 'nonexistent', fontScale: 99 },
        },
      ],
      activeDocumentId: 'doc-1',
    });

    const doc = state.documents[0];
    expect(doc.label).toBe('Untitled resume');
    expect(doc.resume.name).toBe('');
    expect(doc.resume.skills).toEqual(['Go']);
    expect(doc.resume.experience).toEqual([]);
    expect(doc.theme.templateId).toBe('classic');
    expect(doc.theme.fontScale).toBeLessThanOrEqual(1.2);
  });
});

describe('migrateLegacyResume', () => {
  it('falls back to a generic label when there is no name', () => {
    const state = migrateLegacyResume({ headline: 'Engineer' });
    expect(state.documents[0].label).toBe('My resume');
  });
});

describe('version history', () => {
  it('stores the newest snapshot first for a document', () => {
    let versions = appendVersion([], 'doc-1', resumeWithContent('First'), 'A');
    versions = appendVersion(
      versions,
      'doc-1',
      resumeWithContent('Second'),
      'B'
    );

    expect(versionsForDocument(versions, 'doc-1')[0].label).toBe('B');
  });

  it('ignores snapshots of an empty resume', () => {
    expect(appendVersion([], 'doc-1', createEmptyResume(), 'Empty')).toEqual(
      []
    );
  });

  it('caps history per document', () => {
    let versions: ReturnType<typeof appendVersion> = [];
    for (let i = 0; i < 30; i += 1) {
      versions = appendVersion(
        versions,
        'doc-1',
        resumeWithContent(`v${i}`),
        `v${i}`
      );
    }

    expect(versionsForDocument(versions, 'doc-1')).toHaveLength(20);
  });

  it('keeps histories separate per document', () => {
    let versions = appendVersion([], 'doc-1', resumeWithContent(), 'A');
    versions = appendVersion(versions, 'doc-2', resumeWithContent(), 'B');

    expect(versionsForDocument(versions, 'doc-1')).toHaveLength(1);
    expect(versionsForDocument(versions, 'doc-2')).toHaveLength(1);
  });
});
