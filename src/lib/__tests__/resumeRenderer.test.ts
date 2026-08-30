import { describe, expect, it } from 'vitest';

import { createEmptyResume } from '../resumeBuilder';
import {
  escapeHtml,
  renderPrintDocument,
  renderResumeBody,
  renderResumeCss,
} from '../resumeRenderer';
import { DEFAULT_THEME, normalizeTheme } from '../templates';
import type { Resume } from '../types';

function sampleResume(overrides: Partial<Resume> = {}): Resume {
  return {
    ...createEmptyResume(),
    name: 'Ada Lovelace',
    headline: 'Staff Engineer',
    contact: {
      email: 'ada@example.com',
      phone: '+1 555 0100',
      location: 'Berlin',
      website: 'https://ada.dev',
      linkedin: 'https://linkedin.com/in/ada',
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
    ...overrides,
  };
}

describe('escapeHtml', () => {
  it('neutralises markup', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });
});

describe('renderResumeBody', () => {
  it('renders every populated section', () => {
    const html = renderResumeBody(sampleResume(), DEFAULT_THEME);

    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('Summary');
    expect(html).toContain('Experience');
    expect(html).toContain('Education');
    expect(html).toContain('Skills');
    expect(html).toContain('Cut build times by 40%');
  });

  it('omits sections with no content', () => {
    const html = renderResumeBody(createEmptyResume(), DEFAULT_THEME);

    expect(html).not.toContain('Summary');
    expect(html).not.toContain('Experience');
    expect(html).toContain('Your Name');
  });

  it('drops empty bullets', () => {
    const html = renderResumeBody(sampleResume(), DEFAULT_THEME);
    expect(html.match(/<li>/g)).toHaveLength(1);
  });

  it('escapes user content', () => {
    const html = renderResumeBody(
      sampleResume({ name: '<img src=x onerror=alert(1)>' }),
      DEFAULT_THEME
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('strips the protocol from displayed links', () => {
    const html = renderResumeBody(sampleResume(), DEFAULT_THEME);
    expect(html).toContain('ada.dev');
    expect(html).not.toContain('>https://ada.dev<');
  });

  it('renders skills inline by default and as tags when asked', () => {
    const inline = renderResumeBody(sampleResume(), DEFAULT_THEME);
    expect(inline).toContain('TypeScript · Postgres');

    const tagged = renderResumeBody(
      sampleResume(),
      normalizeTheme({ showSkillTags: true })
    );
    expect(tagged).toContain('rf-skills-tags');
  });
});

describe('renderResumeCss', () => {
  it('applies the accent colour and scaled font size', () => {
    const css = renderResumeCss(
      normalizeTheme({ accentColor: '#0f766e', fontScale: 1.2 })
    );

    expect(css).toContain('#0f766e');
    expect(css).toContain('font-size: 12.60pt');
  });

  it('changes heading treatment per template', () => {
    expect(renderResumeCss(normalizeTheme({ templateId: 'modern' }))).toContain(
      'border-left'
    );
    expect(
      renderResumeCss(normalizeTheme({ templateId: 'classic' }))
    ).toContain('border-bottom');
  });
});

describe('renderPrintDocument', () => {
  it('produces a standalone document without inline scripts', () => {
    const html = renderPrintDocument(sampleResume(), DEFAULT_THEME);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('@page');
    // Inline scripts are blocked by the extension CSP, so printing is driven
    // by the caller instead.
    expect(html).not.toContain('<script');
  });

  it('titles the document with the person’s name', () => {
    expect(renderPrintDocument(sampleResume(), DEFAULT_THEME)).toContain(
      '<title>Ada Lovelace — Resume</title>'
    );
  });
});
