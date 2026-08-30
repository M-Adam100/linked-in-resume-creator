import { generateId } from './ids';
import type {
  LinkedInExperience,
  LinkedInProfile,
  Resume,
  ResumeEducation,
  ResumeExperience,
} from './types';

const FILLER_WORDS = new Set([
  'very',
  'really',
  'just',
  'basically',
  'actually',
  'literally',
  'simply',
  'quite',
  'rather',
  'somewhat',
  'extremely',
  'highly',
  'various',
  'numerous',
]);

export const ACTION_VERBS = [
  'Led',
  'Managed',
  'Developed',
  'Designed',
  'Implemented',
  'Created',
  'Built',
  'Delivered',
  'Improved',
  'Optimized',
  'Streamlined',
  'Coordinated',
  'Executed',
  'Established',
  'Spearheaded',
  'Drove',
  'Achieved',
  'Reduced',
  'Increased',
  'Collaborated',
  'Analyzed',
  'Resolved',
  'Automated',
  'Launched',
];

const WEAK_OPENERS = new Set([
  'i',
  'we',
  'my',
  'responsible',
  'responsibilities',
  'duties',
  'worked',
  'helped',
  'assisted',
  'was',
  'were',
  'involved',
  'tasked',
]);

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function removeFillerWords(sentence: string): string {
  return sentence
    .split(/\s+/)
    .filter((word, index) => {
      if (index === 0) return true;
      const lower = word.toLowerCase().replace(/[^a-z]/g, '');
      return !FILLER_WORDS.has(lower);
    })
    .join(' ');
}

export function shortenSentence(sentence: string, maxLength = 200): string {
  const cleaned = removeFillerWords(sentence);
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated}…`;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Bullets are never rewritten automatically — inventing a verb can change
 * what the sentence claims. Instead the editor surfaces this hint so the
 * user decides.
 */
export function needsStrongerOpener(bullet: string): boolean {
  const firstWord =
    bullet
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .replace(/[^a-z]/g, '') ?? '';
  if (!firstWord) return false;
  if (WEAK_OPENERS.has(firstWord)) return true;
  return !ACTION_VERBS.some((verb) => verb.toLowerCase() === firstWord);
}

export function suggestActionVerbs(bullet: string, count = 4): string[] {
  const text = bullet.toLowerCase();

  const contextual: string[] = [];
  const hint = (keywords: string[], verbs: string[]) => {
    if (keywords.some((k) => text.includes(k))) contextual.push(...verbs);
  };

  hint(['team', 'people', 'mentor', 'report'], ['Led', 'Managed', 'Mentored']);
  hint(
    ['built', 'code', 'api', 'service', 'feature'],
    ['Built', 'Developed', 'Shipped']
  );
  hint(['cost', 'time', 'latency', 'bug'], ['Reduced', 'Cut', 'Eliminated']);
  hint(
    ['revenue', 'growth', 'users', 'adoption'],
    ['Increased', 'Grew', 'Drove']
  );
  hint(
    ['process', 'workflow', 'manual'],
    ['Streamlined', 'Automated', 'Standardized']
  );
  hint(
    ['design', 'architecture', 'plan'],
    ['Designed', 'Architected', 'Defined']
  );

  const merged = [...new Set([...contextual, ...ACTION_VERBS])];
  return merged.slice(0, count);
}

/** Replaces the leading weak phrase with the chosen verb. */
export function applyActionVerb(bullet: string, verb: string): string {
  const trimmed = bullet.trim();
  const withoutWeakOpener = trimmed.replace(
    /^(i\s+|we\s+|my\s+|was\s+|were\s+)?(responsible for|responsibilities included|duties included|tasked with|involved in|helped(?:\s+to)?|assisted(?:\s+with|\s+in)?|worked on)\s+/i,
    ''
  );
  const body = withoutWeakOpener === trimmed ? trimmed : withoutWeakOpener;
  const lowered = body.charAt(0).toLowerCase() + body.slice(1);
  return `${verb} ${lowered}`;
}

export function paragraphsToBullets(text: string): string[] {
  if (!text.trim()) return [];

  const lines = text
    .split(/\n|•|·|▪|‣|●/)
    .map(cleanText)
    .filter(Boolean);

  const bullets: string[] = [];

  for (const line of lines) {
    const sentences = line
      .split(/(?<=[.!?])\s+/)
      .map(cleanText)
      .filter((s) => s.length > 10);

    if (sentences.length === 0) {
      if (line.length > 10)
        bullets.push(capitalizeFirst(shortenSentence(line)));
    } else {
      for (const sentence of sentences) {
        bullets.push(capitalizeFirst(shortenSentence(sentence)));
      }
    }
  }

  return deduplicateStrings(bullets);
}

export function deduplicateStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * Experience de-duplication
 *
 * Capture merges several sources (Voyager payloads, embedded JSON, visible
 * DOM), so the same job commonly arrives more than once — sometimes with a
 * missing title, sometimes with a richer description. Entries are collapsed
 * by company + dates and the most complete fields win.
 * ------------------------------------------------------------------ */

function normalizeKeyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|gmbh|plc)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Dates arrive as "Jan 2020 - Present · 3 yrs"; only the range identifies the role. */
function normalizeDuration(duration: string): string {
  return normalizeKeyPart(duration.split('·')[0] ?? duration);
}

function scoreExperience(exp: ResumeExperience): number {
  const bulletChars = exp.bullets.join(' ').length;
  return (
    (exp.title ? 100 : 0) +
    (exp.company ? 40 : 0) +
    (exp.duration ? 20 : 0) +
    (exp.location ? 10 : 0) +
    Math.min(bulletChars, 400) / 10
  );
}

function mergeExperiencePair(
  a: ResumeExperience,
  b: ResumeExperience
): ResumeExperience {
  const [primary, secondary] =
    scoreExperience(a) >= scoreExperience(b) ? [a, b] : [b, a];

  return {
    id: primary.id,
    title: primary.title || secondary.title,
    company: primary.company || secondary.company,
    location: primary.location || secondary.location,
    duration: primary.duration || secondary.duration,
    bullets: deduplicateStrings([...primary.bullets, ...secondary.bullets]),
  };
}

export function deduplicateExperience(
  experience: ResumeExperience[]
): ResumeExperience[] {
  const result: ResumeExperience[] = [];

  for (const exp of experience) {
    const company = normalizeKeyPart(exp.company);
    const title = normalizeKeyPart(exp.title);
    const duration = normalizeDuration(exp.duration);

    const matchIndex = result.findIndex((existing) => {
      const existingCompany = normalizeKeyPart(existing.company);
      const existingTitle = normalizeKeyPart(existing.title);
      const existingDuration = normalizeDuration(existing.duration);

      if (company && existingCompany && company !== existingCompany) {
        return false;
      }

      // Same company and same title is always the same role.
      if (title && existingTitle && title === existingTitle) return true;

      // A titleless stub belongs to whichever role shares its date range.
      if (!title || !existingTitle) {
        return Boolean(duration) && duration === existingDuration;
      }

      // Different titles at one company are separate roles, even if the
      // date ranges happen to overlap.
      return false;
    });

    if (matchIndex === -1) {
      result.push(exp);
    } else {
      result[matchIndex] = mergeExperiencePair(result[matchIndex], exp);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ *
 * Contact details
 * ------------------------------------------------------------------ */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE =
  /\b((?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\/[\w./?%&=+-]*)?)/gi;

export function extractContactFromText(
  text: string
): Partial<Resume['contact']> {
  const contact: Partial<Resume['contact']> = {};

  const email = EMAIL_RE.exec(text);
  if (email) contact.email = email[0];

  // Email addresses are removed first: their domain would otherwise be read
  // as a website and their digits as a phone number.
  const withoutEmails = text.replace(new RegExp(EMAIL_RE.source, 'g'), ' ');

  const phone = PHONE_RE.exec(withoutEmails);
  if (phone) {
    const digits = phone[0].replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      contact.phone = cleanText(phone[0]);
    }
  }

  for (const match of withoutEmails.matchAll(URL_RE)) {
    const url = match[1];
    if (/linkedin\.com\/in\//i.test(url)) {
      contact.linkedin ??= url.replace(/^https?:\/\//i, '');
    } else if (!/linkedin\.com/i.test(url) && !contact.website) {
      contact.website = url.replace(/^https?:\/\//i, '');
    }
  }

  return contact;
}

/* ------------------------------------------------------------------ *
 * LinkedIn profile -> resume
 * ------------------------------------------------------------------ */

export function normalizeLinkedInProfile(profile: LinkedInProfile): Resume {
  const experience: ResumeExperience[] = profile.experience
    .map((exp) => ({
      id: generateId(),
      title: cleanText(exp.title),
      company: cleanText(exp.company),
      location: '',
      duration: cleanText(exp.duration),
      bullets: paragraphsToBullets(exp.description),
    }))
    .filter((exp) => exp.title || exp.company);

  const education: ResumeEducation[] = profile.education
    .map((edu) => ({
      id: generateId(),
      school: cleanText(edu.school),
      degree: cleanText(edu.degree),
      duration: cleanText(edu.duration),
    }))
    .filter((edu) => edu.school || edu.degree);

  const about = cleanText(profile.about);
  const contactFromAbout = extractContactFromText(about);

  return {
    name: cleanText(profile.name),
    headline: cleanText(profile.headline),
    contact: {
      email: contactFromAbout.email ?? '',
      phone: contactFromAbout.phone ?? '',
      location: cleanText(profile.location ?? ''),
      website: contactFromAbout.website ?? '',
      linkedin: contactFromAbout.linkedin ?? '',
    },
    summary: shortenSentence(about, 600),
    experience: deduplicateExperience(experience),
    education: deduplicateEducation(education),
    skills: deduplicateStrings(
      profile.skills.map(cleanText).filter(Boolean)
    ).slice(0, 30),
  };
}

export function deduplicateEducation(
  education: ResumeEducation[]
): ResumeEducation[] {
  const seen = new Set<string>();
  return education.filter((edu) => {
    const key = `${normalizeKeyPart(edu.school)}|${normalizeKeyPart(edu.degree)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createEmptyResume(): Resume {
  return {
    name: '',
    headline: '',
    contact: {
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
  };
}

/* ------------------------------------------------------------------ *
 * Pasted text parsing
 * ------------------------------------------------------------------ */

const SECTION_ALIASES: { section: string; patterns: RegExp[] }[] = [
  { section: 'about', patterns: [/^(about|summary|profile|objective)$/i] },
  {
    section: 'experience',
    patterns: [/^(experience|work experience|employment(?: history)?)$/i],
  },
  { section: 'education', patterns: [/^education$/i] },
  {
    section: 'skills',
    patterns: [/^(skills|top skills|skills? (?:&|and) endorsements)$/i],
  },
];

function matchSection(line: string): string | null {
  const normalized = line.replace(/[:•]/g, '').trim();
  for (const { section, patterns } of SECTION_ALIASES) {
    if (patterns.some((pattern) => pattern.test(normalized))) return section;
  }
  return null;
}

const DURATION_LINE_RE =
  /(\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b)|(\b(19|20)\d{2}\b.*present)|^\s*\d+\s*(yr|year|mo|month)/i;

export function parsePastedProfileText(text: string): LinkedInProfile {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const profile: LinkedInProfile = {
    name: '',
    headline: '',
    about: '',
    experience: [],
    education: [],
    skills: [],
  };

  const contact = extractContactFromText(text);

  let currentSection = 'header';
  let currentExp: Partial<LinkedInExperience> | null = null;
  let descriptionLines: string[] = [];
  const headerLines: string[] = [];

  const flushExperience = () => {
    if (currentExp && (currentExp.title || currentExp.company)) {
      profile.experience.push({
        title: currentExp.title ?? '',
        company: currentExp.company ?? '',
        duration: currentExp.duration ?? '',
        description: descriptionLines.join('\n'),
      });
    }
    currentExp = null;
    descriptionLines = [];
  };

  for (const line of lines) {
    const section = matchSection(line);
    if (section) {
      flushExperience();
      currentSection = section;
      continue;
    }

    switch (currentSection) {
      case 'header':
        headerLines.push(line);
        break;

      case 'about':
        profile.about += (profile.about ? ' ' : '') + line;
        break;

      case 'experience':
        if (!currentExp) {
          currentExp = { title: line };
        } else if (DURATION_LINE_RE.test(line) && !currentExp.duration) {
          currentExp.duration = line;
        } else if (!currentExp.company) {
          currentExp.company = line;
        } else {
          descriptionLines.push(line);
        }
        break;

      case 'education': {
        const parts = line.split(/[|·]/).map((part) => part.trim());
        if (DURATION_LINE_RE.test(line) && profile.education.length > 0) {
          const last = profile.education[profile.education.length - 1];
          if (!last.duration) {
            last.duration = line;
            break;
          }
        }
        profile.education.push({
          school: parts[0] ?? line,
          degree: parts[1] ?? '',
          duration: parts[2] ?? '',
        });
        break;
      }

      case 'skills':
        profile.skills.push(
          ...line
            .split(/[,;|·]/)
            .map((skill) => skill.trim())
            .filter(Boolean)
        );
        break;
    }
  }

  flushExperience();

  const usableHeader = headerLines.filter(
    (line) => !EMAIL_RE.test(line) && !URL_RE.test(line)
  );
  profile.name = usableHeader[0] ?? headerLines[0] ?? '';
  profile.headline = usableHeader[1] ?? '';

  if (contact.linkedin || contact.email || contact.phone) {
    // Contact details live on the resume, not the LinkedIn profile shape, so
    // they are appended to `about` and picked up during normalisation.
    const details = [
      contact.email,
      contact.phone,
      contact.linkedin,
      contact.website,
    ]
      .filter(Boolean)
      .join(' ');
    if (details && !profile.about.includes(details)) {
      profile.about = profile.about ? `${profile.about} ${details}` : details;
    }
  }

  return profile;
}

/* ------------------------------------------------------------------ *
 * Manual editing helpers
 * ------------------------------------------------------------------ */

export function addExperience(resume: Resume): Resume {
  return {
    ...resume,
    experience: [
      ...resume.experience,
      {
        id: generateId(),
        title: '',
        company: '',
        location: '',
        duration: '',
        bullets: [''],
      },
    ],
  };
}

export function addEducation(resume: Resume): Resume {
  return {
    ...resume,
    education: [
      ...resume.education,
      { id: generateId(), school: '', degree: '', duration: '' },
    ],
  };
}

export function reorderExperience(
  resume: Resume,
  fromIndex: number,
  toIndex: number
): Resume {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= resume.experience.length ||
    toIndex >= resume.experience.length
  ) {
    return resume;
  }

  const experience = [...resume.experience];
  const [moved] = experience.splice(fromIndex, 1);
  if (!moved) return resume;
  experience.splice(toIndex, 0, moved);
  return { ...resume, experience };
}
