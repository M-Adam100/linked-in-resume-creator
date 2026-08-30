import { generateId } from './ids';
import type { Resume } from './types';

/**
 * Persisted and imported data is untrusted: it may come from an older schema,
 * a hand-edited JSON file, or a partially completed write. Every field is
 * coerced to its expected type so the rest of the app can assume the shape.
 */

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function normalizeResume(raw: unknown): Resume {
  const source = (raw ?? {}) as Record<string, unknown>;
  const contactSource = (source.contact ?? {}) as Record<string, unknown>;

  const experience = Array.isArray(source.experience)
    ? source.experience.map((item) => {
        const exp = (item ?? {}) as Record<string, unknown>;
        return {
          id: asString(exp.id) || generateId(),
          title: asString(exp.title),
          company: asString(exp.company),
          location: asString(exp.location),
          duration: asString(exp.duration),
          bullets: asStringArray(exp.bullets),
        };
      })
    : [];

  const education = Array.isArray(source.education)
    ? source.education.map((item) => {
        const edu = (item ?? {}) as Record<string, unknown>;
        return {
          id: asString(edu.id) || generateId(),
          school: asString(edu.school),
          degree: asString(edu.degree),
          duration: asString(edu.duration),
        };
      })
    : [];

  return {
    name: asString(source.name),
    headline: asString(source.headline),
    contact: {
      email: asString(contactSource.email),
      phone: asString(contactSource.phone),
      location: asString(contactSource.location),
      website: asString(contactSource.website),
      linkedin: asString(contactSource.linkedin),
    },
    summary: asString(source.summary),
    experience,
    education,
    skills: asStringArray(source.skills),
  };
}

export function isEmptyResume(resume: Resume): boolean {
  return (
    !resume.name &&
    !resume.headline &&
    !resume.summary &&
    resume.experience.length === 0 &&
    resume.education.length === 0 &&
    resume.skills.length === 0
  );
}
