import { beforeEach, describe, expect, it } from 'vitest';

import { flushState } from '../../lib/storage';
import { resetChromeMock } from '../../test/chromeMock';
import { selectActiveDocument, useResumeStore } from '../resumeStore';

const store = () => useResumeStore.getState();

function activeResume() {
  const doc = selectActiveDocument(store());
  if (!doc) throw new Error('No active document');
  return doc.resume;
}

beforeEach(async () => {
  resetChromeMock();
  await store().hydrate();
});

describe('hydrate', () => {
  it('starts with one document ready to edit', () => {
    expect(store().hydrated).toBe(true);
    expect(store().documents).toHaveLength(1);
    expect(store().activeDocumentId).toBe(store().documents[0].id);
  });
});

describe('documents', () => {
  it('creates and activates a new resume', () => {
    const id = store().createNewDocument('Backend roles');

    expect(store().documents).toHaveLength(2);
    expect(store().activeDocumentId).toBe(id);
    expect(selectActiveDocument(store())?.label).toBe('Backend roles');
  });

  it('duplicates a resume without sharing its data', () => {
    store().updateResume({ name: 'Ada' });
    const originalId = store().activeDocumentId!;

    store().duplicateDocument(originalId);
    store().updateResume({ name: 'Grace' });

    const original = store().documents.find((doc) => doc.id === originalId);
    expect(original?.resume.name).toBe('Ada');
    expect(activeResume().name).toBe('Grace');
    expect(selectActiveDocument(store())?.label).toContain('(copy)');
  });

  it('always keeps at least one resume', () => {
    store().deleteDocument(store().activeDocumentId!);

    expect(store().documents).toHaveLength(1);
    expect(store().activeDocumentId).toBe(store().documents[0].id);
  });

  it('deletes a resume and its history together', () => {
    store().updateResume({ name: 'Ada' });
    store().saveVersion('Snapshot');
    const doomed = store().activeDocumentId!;

    store().createNewDocument('Keeper');
    store().deleteDocument(doomed);

    expect(store().versions.some((v) => v.documentId === doomed)).toBe(false);
  });

  it('falls back to a default label when renamed to nothing', () => {
    store().renameDocument(store().activeDocumentId!, '');
    expect(selectActiveDocument(store())?.label).toBe('Untitled resume');
  });
});

describe('editing', () => {
  it('updates contact fields independently', () => {
    store().updateContact({ email: 'ada@example.com' });
    store().updateContact({ phone: '+1 555 0100' });

    expect(activeResume().contact).toMatchObject({
      email: 'ada@example.com',
      phone: '+1 555 0100',
    });
  });

  it('adds, edits and removes a role', () => {
    store().addExperienceEntry();
    const roleId = activeResume().experience[0].id;

    store().updateExperience(roleId, { title: 'Engineer' });
    expect(activeResume().experience[0].title).toBe('Engineer');

    store().removeExperience(roleId);
    expect(activeResume().experience).toHaveLength(0);
  });

  it('manages bullets within a role', () => {
    store().addExperienceEntry();
    const roleId = activeResume().experience[0].id;

    store().updateBullet(roleId, 0, 'First');
    store().addBullet(roleId);
    store().updateBullet(roleId, 1, 'Second');
    expect(activeResume().experience[0].bullets).toEqual(['First', 'Second']);

    store().moveBullet(roleId, 1, 0);
    expect(activeResume().experience[0].bullets).toEqual(['Second', 'First']);

    store().removeBullet(roleId, 0);
    expect(activeResume().experience[0].bullets).toEqual(['First']);
  });

  it('rejects duplicate skills regardless of case', () => {
    store().addSkill('TypeScript');
    store().addSkill('typescript');
    store().addSkill('  ');

    expect(activeResume().skills).toEqual(['TypeScript']);
  });

  it('imports a LinkedIn profile and names the document after it', () => {
    store().importLinkedInProfile({
      name: 'Ada Lovelace',
      headline: 'Engineer',
      about: 'Bio',
      experience: [
        {
          title: 'Engineer',
          company: 'Acme',
          duration: '2020',
          description: 'Shipped the thing.',
        },
      ],
      education: [],
      skills: ['Go'],
    });

    expect(activeResume().name).toBe('Ada Lovelace');
    expect(selectActiveDocument(store())?.label).toBe("Ada Lovelace's resume");
  });

  it('imports pasted text', () => {
    store().importPastedText('Ada Lovelace\nEngineer\nSkills\nGo, Rust');

    expect(activeResume().name).toBe('Ada Lovelace');
    expect(activeResume().skills).toEqual(['Go', 'Rust']);
  });
});

describe('theme', () => {
  it('applies theme changes per document', () => {
    store().updateTheme({ templateId: 'compact', fontScale: 1.1 });
    const first = store().activeDocumentId!;

    store().createNewDocument('Second');
    expect(selectActiveDocument(store())?.theme.templateId).toBe('classic');

    store().selectDocument(first);
    expect(selectActiveDocument(store())?.theme).toMatchObject({
      templateId: 'compact',
      fontScale: 1.1,
    });
  });

  it('clamps out-of-range values', () => {
    store().updateTheme({ fontScale: 99 });
    expect(selectActiveDocument(store())?.theme.fontScale).toBeLessThanOrEqual(
      1.2
    );
  });
});

describe('history', () => {
  it('snapshots before an import and restores it', () => {
    store().updateResume({ name: 'Original' });
    store().importPastedText('Replacement\nEngineer');
    expect(activeResume().name).toBe('Replacement');

    const snapshot = store().versions.find(
      (version) => version.resume.name === 'Original'
    );
    expect(snapshot).toBeTruthy();

    store().restoreVersion(snapshot!.id);
    expect(activeResume().name).toBe('Original');
  });

  it('snapshots before clearing a resume', () => {
    store().updateResume({ name: 'Ada' });
    store().clearActiveResume();

    expect(activeResume().name).toBe('');
    expect(store().versions).not.toHaveLength(0);
  });

  it('deletes a snapshot', () => {
    store().updateResume({ name: 'Ada' });
    store().saveVersion('Manual');
    const id = store().versions[0].id;

    store().deleteVersion(id);
    expect(store().versions.some((version) => version.id === id)).toBe(false);
  });
});

describe('persistence', () => {
  it('writes changes to chrome.storage', async () => {
    store().updateResume({ name: 'Persisted' });
    await flushState();

    const stored = await chrome.storage.local.get('resumeforge:state');
    const state = stored['resumeforge:state'] as {
      documents: { resume: { name: string } }[];
    };

    expect(state.documents[0].resume.name).toBe('Persisted');
  });

  it('resetEverything clears storage and starts over', async () => {
    store().updateResume({ name: 'Ada' });
    store().saveVersion('Manual');

    await store().resetEverything();

    expect(store().versions).toEqual([]);
    expect(activeResume().name).toBe('');
    expect(store().documents).toHaveLength(1);
  });

  it('settings changes are persisted', async () => {
    store().updateSettings({ advancedCapture: false });
    await flushState();

    const stored = await chrome.storage.local.get('resumeforge:state');
    const state = stored['resumeforge:state'] as {
      settings: { advancedCapture: boolean };
    };

    expect(state.settings.advancedCapture).toBe(false);
  });
});
