import { describe, expect, it } from 'vitest';

import { buildDocxBlob } from '../docx';
import { createEmptyResume } from '../resumeBuilder';
import { DEFAULT_THEME, normalizeTheme } from '../templates';
import type { Resume } from '../types';

function fullResume(): Resume {
  return {
    ...createEmptyResume(),
    name: 'Ada Lovelace',
    headline: 'Staff Engineer',
    contact: {
      email: 'ada@example.com',
      phone: '+1 555 0100',
      location: 'Berlin',
      website: 'ada.dev',
      linkedin: 'linkedin.com/in/ada',
    },
    summary: 'Builds data platforms.',
    experience: [
      {
        id: 'exp-1',
        title: 'Staff Engineer',
        company: 'Acme',
        location: 'Remote',
        duration: '2020 - Present',
        bullets: ['Cut build times by 40%', ''],
      },
      {
        id: 'exp-2',
        title: '',
        company: 'Globex',
        location: '',
        duration: '2018 - 2020',
        bullets: [],
      },
    ],
    education: [
      {
        id: 'edu-1',
        school: 'Cambridge',
        degree: 'BSc Computer Science',
        duration: '2014 - 2018',
      },
    ],
    skills: ['TypeScript', 'Postgres'],
  };
}

describe('buildDocxBlob', () => {
  it('produces a non-empty Word document', async () => {
    const blob = await buildDocxBlob(fullResume(), DEFAULT_THEME);

    expect(blob.size).toBeGreaterThan(1000);
  });

  it('handles an empty resume without throwing', async () => {
    const blob = await buildDocxBlob(createEmptyResume(), DEFAULT_THEME);

    expect(blob.size).toBeGreaterThan(0);
  });

  it('builds each template and typeface variant', async () => {
    const variants = [
      normalizeTheme({ templateId: 'classic', fontFamily: 'serif' }),
      normalizeTheme({ templateId: 'modern' }),
      normalizeTheme({ templateId: 'compact', fontScale: 0.9, density: 0.85 }),
    ];

    for (const theme of variants) {
      const blob = await buildDocxBlob(fullResume(), theme);
      expect(blob.size).toBeGreaterThan(1000);
    }
  });
});
