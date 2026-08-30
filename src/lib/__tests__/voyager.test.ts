import { describe, expect, it } from 'vitest';

import {
  dedupeEducation,
  dedupeExperiences,
  dedupeSkills,
  mergeProfiles,
} from '../voyager';
import type { LinkedInExperience, LinkedInProfile } from '../types';

function exp(overrides: Partial<LinkedInExperience> = {}): LinkedInExperience {
  return {
    title: '',
    company: '',
    duration: '',
    description: '',
    ...overrides,
  };
}

function profile(overrides: Partial<LinkedInProfile> = {}): LinkedInProfile {
  return {
    name: '',
    headline: '',
    about: '',
    experience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}

describe('dedupeExperiences', () => {
  it('collapses a role captured from three sources into one entry', () => {
    // This is the shape capture actually produces: the DOM knows the title,
    // one payload carries the description, another repeats the dates.
    const result = dedupeExperiences([
      exp({
        title: 'Staff Engineer',
        company: 'Acme',
        duration: '2020 - Present',
      }),
      exp({
        company: 'Acme',
        duration: '2020 - Present · 4 yrs 2 mos',
        description: 'Owned the billing platform end to end.',
      }),
      exp({ title: 'Staff Engineer', company: 'Acme Inc.' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Staff Engineer');
    expect(result[0].description).toBe(
      'Owned the billing platform end to end.'
    );
  });

  it('does not leave a stale copy behind after merging', () => {
    const result = dedupeExperiences([
      exp({ company: 'Acme', duration: 'Jan 2020 - Present' }),
      exp({
        title: 'Engineer',
        company: 'Acme',
        duration: 'Jan 2020 - Present',
      }),
      exp({
        title: 'Engineer',
        company: 'Acme',
        duration: 'Jan 2020 - Present',
      }),
    ]);

    expect(result).toHaveLength(1);
  });

  it('keeps separate roles at the same company', () => {
    const result = dedupeExperiences([
      exp({ title: 'Engineer', company: 'Acme', duration: '2018 - 2020' }),
      exp({
        title: 'Senior Engineer',
        company: 'Acme',
        duration: '2020 - 2022',
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('keeps the longest description when merging', () => {
    const result = dedupeExperiences([
      exp({ title: 'Engineer', company: 'Acme', description: 'Short.' }),
      exp({
        title: 'Engineer',
        company: 'Acme',
        description: 'A much longer description of the same role.',
      }),
    ]);

    expect(result[0].description).toBe(
      'A much longer description of the same role.'
    );
  });

  it('discards employment-type fragments', () => {
    const result = dedupeExperiences([
      exp({ title: 'Full-time' }),
      exp({ title: 'Engineer', company: 'Acme' }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Engineer');
  });

  it('discards entries with no title and no company', () => {
    expect(dedupeExperiences([exp({ duration: '2020' })])).toEqual([]);
  });
});

describe('dedupeEducation', () => {
  it('matches on school and degree regardless of punctuation', () => {
    const result = dedupeEducation([
      { school: 'Cambridge', degree: 'BSc, Computer Science', duration: '' },
      { school: 'cambridge', degree: 'BSc Computer Science', duration: '2014' },
    ]);

    expect(result).toHaveLength(1);
  });

  it('drops empty entries', () => {
    expect(
      dedupeEducation([{ school: '', degree: '', duration: '2020' }])
    ).toEqual([]);
  });
});

describe('dedupeSkills', () => {
  it('removes case duplicates and blanks', () => {
    expect(dedupeSkills(['Go', 'go', '  ', 'Rust'])).toEqual(['Go', 'Rust']);
  });
});

describe('mergeProfiles', () => {
  it('lets the primary profile win on scalar fields', () => {
    const merged = mergeProfiles(
      profile({ name: 'Ada Lovelace', location: 'Berlin' }),
      profile({ name: 'A. Lovelace', headline: 'Staff Engineer' })
    );

    expect(merged.name).toBe('Ada Lovelace');
    expect(merged.headline).toBe('Staff Engineer');
    expect(merged.location).toBe('Berlin');
  });

  it('keeps the longer about text', () => {
    const merged = mergeProfiles(
      profile({ about: 'Short bio.' }),
      profile({ about: 'A considerably longer biography with detail.' })
    );

    expect(merged.about).toBe('A considerably longer biography with detail.');
  });

  it('merges experience from both sides without duplicating roles', () => {
    const merged = mergeProfiles(
      profile({
        experience: [exp({ title: 'Engineer', company: 'Acme' })],
        skills: ['Go'],
      }),
      profile({
        experience: [
          exp({
            title: 'Engineer',
            company: 'Acme',
            description: 'Built the API.',
          }),
          exp({ title: 'Intern', company: 'Globex' }),
        ],
        skills: ['go', 'Rust'],
      })
    );

    expect(merged.experience).toHaveLength(2);
    expect(merged.experience[0].description).toBe('Built the API.');
    expect(merged.skills).toEqual(['Go', 'Rust']);
  });
});
