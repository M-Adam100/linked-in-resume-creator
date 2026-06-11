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

const ACTION_VERBS = [
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

function generateId(): string {
  return crypto.randomUUID();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function removeFillerWords(sentence: string): string {
  return sentence
    .split(/\s+/)
    .filter((word, index) => {
      const lower = word.toLowerCase().replace(/[^a-z]/g, '');
      if (index === 0) return true;
      return !FILLER_WORDS.has(lower);
    })
    .join(' ');
}

function shortenSentence(sentence: string, maxLength = 160): string {
  const cleaned = removeFillerWords(sentence);
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

function ensureActionVerb(sentence: string): string {
  const trimmed = sentence.trim();
  if (!trimmed) return trimmed;

  const firstWord = trimmed.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') ?? '';
  const isVerb =
    firstWord.length > 2 &&
    (firstWord.endsWith('ed') ||
      firstWord.endsWith('ing') ||
      /^[A-Z][a-z]+/.test(firstWord));

  if (isVerb && /^[A-Z]/.test(firstWord)) {
    return trimmed;
  }

  const verb = ACTION_VERBS[Math.floor(Math.random() * ACTION_VERBS.length)];
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `${verb} ${lower}`;
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

    if (sentences.length === 0 && line.length > 10) {
      bullets.push(ensureActionVerb(shortenSentence(line)));
    } else {
      for (const sentence of sentences) {
        bullets.push(ensureActionVerb(shortenSentence(sentence)));
      }
    }
  }

  return deduplicateStrings(bullets);
}

function deduplicateStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeExperienceKey(exp: {
  title: string;
  company: string;
}): string {
  return `${exp.title.toLowerCase()}|${exp.company.toLowerCase()}`;
}

export function deduplicateExperience(
  experience: ResumeExperience[]
): ResumeExperience[] {
  const seen = new Set<string>();
  return experience.filter((exp) => {
    const key = normalizeExperienceKey(exp);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeLinkedInProfile(profile: LinkedInProfile): Resume {
  const experience: ResumeExperience[] = profile.experience
    .map((exp) => ({
      id: generateId(),
      title: cleanText(exp.title),
      company: cleanText(exp.company),
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

  return {
    name: cleanText(profile.name),
    headline: cleanText(profile.headline),
    summary: shortenSentence(cleanText(profile.about), 500),
    experience: deduplicateExperience(experience),
    education,
    skills: deduplicateStrings(
      profile.skills.map(cleanText).filter(Boolean)
    ).slice(0, 30),
  };
}

export function createEmptyResume(): Resume {
  return {
    name: '',
    headline: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
  };
}

export function parsePastedProfileText(text: string): LinkedInProfile {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const profile: LinkedInProfile = {
    name: lines[0] ?? '',
    headline: lines[1] ?? '',
    about: '',
    experience: [],
    education: [],
    skills: [],
  };

  let currentSection = '';
  let currentExp: Partial<LinkedInExperience> | null = null;
  let descriptionLines: string[] = [];

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

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (
      lower === 'about' ||
      lower === 'summary' ||
      lower.startsWith('about ')
    ) {
      flushExperience();
      currentSection = 'about';
      continue;
    }
    if (
      lower === 'experience' ||
      lower.startsWith('experience ')
    ) {
      flushExperience();
      currentSection = 'experience';
      continue;
    }
    if (
      lower === 'education' ||
      lower.startsWith('education ')
    ) {
      flushExperience();
      currentSection = 'education';
      continue;
    }
    if (
      lower === 'skills' ||
      lower.startsWith('skills ')
    ) {
      flushExperience();
      currentSection = 'skills';
      continue;
    }

    switch (currentSection) {
      case 'about':
        profile.about += (profile.about ? ' ' : '') + line;
        break;
      case 'experience':
        if (!currentExp) {
          currentExp = { title: line };
        } else if (!currentExp.company) {
          currentExp.company = line;
        } else if (!currentExp.duration) {
          currentExp.duration = line;
        } else {
          descriptionLines.push(line);
        }
        break;
      case 'education': {
        const parts = line.split('|').map((p) => p.trim());
        profile.education.push({
          school: parts[0] ?? line,
          degree: parts[1] ?? '',
          duration: parts[2] ?? '',
        });
        break;
      }
      case 'skills':
        profile.skills.push(
          ...line.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
        );
        break;
      default:
        if (!profile.about && i < 5) {
          profile.about += (profile.about ? ' ' : '') + line;
        }
    }
  }

  flushExperience();
  return profile;
}

export function addExperience(resume: Resume): Resume {
  return {
    ...resume,
    experience: [
      ...resume.experience,
      {
        id: generateId(),
        title: '',
        company: '',
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
      {
        id: generateId(),
        school: '',
        degree: '',
        duration: '',
      },
    ],
  };
}

export function reorderExperience(
  resume: Resume,
  fromIndex: number,
  toIndex: number
): Resume {
  const experience = [...resume.experience];
  const [moved] = experience.splice(fromIndex, 1);
  if (!moved) return resume;
  experience.splice(toIndex, 0, moved);
  return { ...resume, experience };
}
