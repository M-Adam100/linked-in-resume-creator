import { describe, expect, it } from 'vitest';

import {
  applyActionVerb,
  cleanText,
  createEmptyResume,
  deduplicateExperience,
  deduplicateStrings,
  extractContactFromText,
  needsStrongerOpener,
  normalizeLinkedInProfile,
  paragraphsToBullets,
  parsePastedProfileText,
  reorderExperience,
  shortenSentence,
  suggestActionVerbs,
} from '../resumeBuilder';
import type { LinkedInProfile, ResumeExperience } from '../types';

function experience(
  overrides: Partial<ResumeExperience> = {}
): ResumeExperience {
  return {
    id: Math.random().toString(36).slice(2),
    title: '',
    company: '',
    location: '',
    duration: '',
    bullets: [],
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

describe('cleanText', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanText('  Senior   Engineer \n at Acme ')).toBe(
      'Senior Engineer at Acme'
    );
  });
});

describe('shortenSentence', () => {
  it('drops filler words but keeps the first word', () => {
    expect(shortenSentence('Really improved the very slow build')).toBe(
      'Really improved the slow build'
    );
  });

  it('truncates at a word boundary', () => {
    const result = shortenSentence('a'.repeat(30) + ' ' + 'b'.repeat(30), 40);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(41);
  });
});

describe('paragraphsToBullets', () => {
  it('splits on bullet glyphs and sentences', () => {
    const bullets = paragraphsToBullets(
      '• Shipped the billing service to production.\n• Reduced page load time by 40%. Mentored two engineers.'
    );

    expect(bullets).toEqual([
      'Shipped the billing service to production.',
      'Reduced page load time by 40%.',
      'Mentored two engineers.',
    ]);
  });

  it('does not invent an action verb', () => {
    const bullets = paragraphsToBullets(
      'responsible for the migration of the data warehouse'
    );
    expect(bullets).toEqual([
      'Responsible for the migration of the data warehouse',
    ]);
  });

  it('drops repeated lines', () => {
    expect(
      paragraphsToBullets('Led the platform team\n• Led the platform team')
    ).toHaveLength(1);
  });

  it('returns nothing for empty input', () => {
    expect(paragraphsToBullets('   ')).toEqual([]);
  });
});

describe('action verb helpers', () => {
  it('flags weak openers', () => {
    expect(needsStrongerOpener('Responsible for hiring')).toBe(true);
    expect(needsStrongerOpener('Led hiring for the team')).toBe(false);
  });

  it('suggests verbs relevant to the bullet', () => {
    expect(suggestActionVerbs('reduced the cost of the build')).toContain(
      'Reduced'
    );
  });

  it('replaces the weak opener rather than prefixing it', () => {
    expect(applyActionVerb('Responsible for the checkout rewrite', 'Led')).toBe(
      'Led the checkout rewrite'
    );
  });

  it('prefixes when there is no weak phrase to replace', () => {
    expect(applyActionVerb('Checkout rewrite', 'Led')).toBe(
      'Led checkout rewrite'
    );
  });
});

describe('deduplicateStrings', () => {
  it('ignores case and punctuation', () => {
    expect(deduplicateStrings(['React', 'react!', 'Vue'])).toEqual([
      'React',
      'Vue',
    ]);
  });
});

describe('deduplicateExperience', () => {
  it('merges a titleless duplicate into the titled entry', () => {
    const result = deduplicateExperience([
      experience({
        company: 'Acme Inc.',
        duration: 'Jan 2020 - Present · 4 yrs',
        bullets: ['Built the billing pipeline'],
      }),
      experience({
        title: 'Staff Engineer',
        company: 'Acme',
        duration: 'Jan 2020 - Present',
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Staff Engineer');
    expect(result[0].bullets).toEqual(['Built the billing pipeline']);
  });

  it('keeps promotions at the same company as separate roles', () => {
    const result = deduplicateExperience([
      experience({
        title: 'Senior Engineer',
        company: 'Acme',
        duration: '2018 - 2020',
      }),
      experience({
        title: 'Staff Engineer',
        company: 'Acme',
        duration: '2020 - Present',
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('collapses the same role captured twice with different formatting', () => {
    const result = deduplicateExperience([
      experience({ title: 'Staff Engineer', company: 'Acme Inc.' }),
      experience({ title: 'staff engineer', company: 'Acme, Inc' }),
    ]);

    expect(result).toHaveLength(1);
  });

  it('prefers the entry with more content when merging', () => {
    const result = deduplicateExperience([
      experience({ title: 'Engineer', company: 'Acme' }),
      experience({
        title: 'Engineer',
        company: 'Acme',
        location: 'Berlin',
        duration: '2020 - 2022',
        bullets: ['Shipped the API gateway'],
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      location: 'Berlin',
      duration: '2020 - 2022',
      bullets: ['Shipped the API gateway'],
    });
  });

  it('does not merge different companies that share a date range', () => {
    const result = deduplicateExperience([
      experience({ company: 'Acme', duration: '2020 - 2022' }),
      experience({ company: 'Globex', duration: '2020 - 2022' }),
    ]);

    expect(result).toHaveLength(2);
  });
});

describe('extractContactFromText', () => {
  it('picks up email, phone, LinkedIn and website', () => {
    const contact = extractContactFromText(
      'Reach me at ada@example.com or +1 (555) 010-2030. linkedin.com/in/ada-lovelace and ada.dev'
    );

    expect(contact.email).toBe('ada@example.com');
    expect(contact.phone).toBe('+1 (555) 010-2030');
    expect(contact.linkedin).toBe('linkedin.com/in/ada-lovelace');
    expect(contact.website).toBe('ada.dev');
  });

  it('ignores digit strings that are not phone numbers', () => {
    expect(extractContactFromText('Grew revenue 12%').phone).toBeUndefined();
  });
});

describe('normalizeLinkedInProfile', () => {
  it('maps a profile onto the resume shape', () => {
    const resume = normalizeLinkedInProfile(
      profile({
        name: '  Ada  Lovelace ',
        headline: 'Staff Engineer',
        about: 'I build data platforms. Contact: ada@example.com',
        location: 'Berlin, Germany',
        experience: [
          {
            title: 'Staff Engineer',
            company: 'Acme',
            duration: '2020 - Present',
            description: '• Led the billing rewrite.',
          },
        ],
        education: [
          { school: 'Cambridge', degree: 'BSc', duration: '2014 - 2018' },
        ],
        skills: ['TypeScript', 'typescript', 'Postgres'],
      })
    );

    expect(resume.name).toBe('Ada Lovelace');
    expect(resume.contact.email).toBe('ada@example.com');
    expect(resume.contact.location).toBe('Berlin, Germany');
    expect(resume.experience[0].bullets).toEqual(['Led the billing rewrite.']);
    expect(resume.skills).toEqual(['TypeScript', 'Postgres']);
  });

  it('drops entries with neither a title nor a company', () => {
    const resume = normalizeLinkedInProfile(
      profile({
        experience: [
          { title: '', company: '', duration: '2020', description: '' },
        ],
      })
    );

    expect(resume.experience).toEqual([]);
  });
});

describe('parsePastedProfileText', () => {
  const pasted = `Ada Lovelace
Staff Engineer at Acme

About
I build data platforms teams enjoy using.

Experience
Staff Engineer
Acme Inc.
Jan 2021 - Present
Led the migration of the billing pipeline.

Education
University of Cambridge | BSc Computer Science | 2014 - 2018

Skills
TypeScript, Postgres, Kafka`;

  it('reads the header, sections and skills', () => {
    const parsed = parsePastedProfileText(pasted);

    expect(parsed.name).toBe('Ada Lovelace');
    expect(parsed.headline).toBe('Staff Engineer at Acme');
    expect(parsed.about).toContain('data platforms');
    expect(parsed.skills).toEqual(['TypeScript', 'Postgres', 'Kafka']);
  });

  it('assigns title, company, dates and description in order', () => {
    const [role] = parsePastedProfileText(pasted).experience;

    expect(role.title).toBe('Staff Engineer');
    expect(role.company).toBe('Acme Inc.');
    expect(role.duration).toBe('Jan 2021 - Present');
    expect(role.description).toContain('billing pipeline');
  });

  it('recognises alternative section headings', () => {
    const parsed = parsePastedProfileText(
      'Ada\nEngineer\nWork Experience\nEngineer\nAcme\nTop Skills\nGo, Rust'
    );

    expect(parsed.experience).toHaveLength(1);
    expect(parsed.skills).toEqual(['Go', 'Rust']);
  });

  it('survives empty input', () => {
    const parsed = parsePastedProfileText('');
    expect(parsed.name).toBe('');
    expect(parsed.experience).toEqual([]);
  });
});

describe('reorderExperience', () => {
  const resume = {
    ...createEmptyResume(),
    experience: [
      experience({ title: 'A' }),
      experience({ title: 'B' }),
      experience({ title: 'C' }),
    ],
  };

  it('moves an entry to a new index', () => {
    const result = reorderExperience(resume, 0, 2);
    expect(result.experience.map((e) => e.title)).toEqual(['B', 'C', 'A']);
  });

  it('ignores out-of-range indexes', () => {
    expect(reorderExperience(resume, 0, 9)).toBe(resume);
    expect(reorderExperience(resume, 1, 1)).toBe(resume);
  });
});
