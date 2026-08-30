import { describe, expect, it } from 'vitest';

import { buildExportFile, buildFileBaseName, parseResumeJson } from '../export';
import { createEmptyResume } from '../resumeBuilder';
import { DEFAULT_THEME } from '../templates';

describe('buildFileBaseName', () => {
  it('builds a filesystem-safe name', () => {
    expect(
      buildFileBaseName({ ...createEmptyResume(), name: 'Ada Lovelace' })
    ).toBe('Ada_Lovelace_Resume');
  });

  it('strips characters that break downloads', () => {
    expect(
      buildFileBaseName({ ...createEmptyResume(), name: 'Ada / "Lo:ve"' })
    ).toBe('Ada_Love_Resume');
  });

  it('falls back when there is no name', () => {
    expect(buildFileBaseName(createEmptyResume())).toBe('resume_Resume');
  });
});

describe('parseResumeJson', () => {
  it('round-trips an exported file', () => {
    const resume = { ...createEmptyResume(), name: 'Ada', skills: ['Go'] };
    const file = JSON.stringify(buildExportFile(resume, DEFAULT_THEME));

    const parsed = parseResumeJson(file);
    expect(parsed.resume.name).toBe('Ada');
    expect(parsed.resume.skills).toEqual(['Go']);
    expect(parsed.theme.templateId).toBe(DEFAULT_THEME.templateId);
  });

  it('accepts a bare resume object from the 1.0 export format', () => {
    const parsed = parseResumeJson(
      JSON.stringify({ name: 'Ada', headline: 'Engineer' })
    );

    expect(parsed.resume.name).toBe('Ada');
    expect(parsed.resume.contact.email).toBe('');
  });

  it('rejects malformed JSON', () => {
    expect(() => parseResumeJson('{ not json')).toThrow(/not valid JSON/);
  });

  it('rejects a file with no resume content', () => {
    expect(() => parseResumeJson(JSON.stringify({ foo: 'bar' }))).toThrow(
      /does not contain/
    );
  });

  it('repairs a partially malformed resume', () => {
    const parsed = parseResumeJson(
      JSON.stringify({
        name: 'Ada',
        experience: [{ title: 'Engineer', bullets: ['Shipped it', 9] }],
        skills: 'not-an-array',
      })
    );

    expect(parsed.resume.experience[0].company).toBe('');
    expect(parsed.resume.experience[0].bullets).toEqual(['Shipped it']);
    expect(parsed.resume.experience[0].id).toBeTruthy();
    expect(parsed.resume.skills).toEqual([]);
  });
});
