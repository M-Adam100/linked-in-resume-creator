import { getTemplate } from './templates';
import type { Resume, ThemeSettings } from './types';

const FONT_STACKS: Record<ThemeSettings['fontFamily'], string> = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Stylesheet shared by the on-screen preview and the printable document, so
 * what the user sees in the editor is what lands in the PDF.
 */
export function renderResumeCss(theme: ThemeSettings): string {
  const template = getTemplate(theme.templateId);
  const fontPt = (template.baseFontPt * theme.fontScale).toFixed(2);
  const sectionGap = (template.sectionGapEm * theme.density).toFixed(2);
  const itemGap = (0.7 * theme.density).toFixed(2);
  const accent = theme.accentColor;

  const headingRules: Record<string, string> = {
    rule: `
      .rf-section-title {
        border-bottom: 1px solid #c9ced6;
        padding-bottom: 0.2em;
        color: ${accent};
      }`,
    caps: `
      .rf-section-title {
        color: ${accent};
        letter-spacing: 0.14em;
      }`,
    'accent-bar': `
      .rf-section-title {
        color: ${accent};
        border-left: 3px solid ${accent};
        padding-left: 0.5em;
      }`,
  };

  return `
    .rf-root {
      font-family: ${FONT_STACKS[theme.fontFamily]};
      font-size: ${fontPt}pt;
      line-height: ${(1.45 * theme.density).toFixed(2)};
      color: #1f2328;
      -webkit-font-smoothing: antialiased;
    }
    .rf-root * { box-sizing: border-box; }
    .rf-header {
      text-align: ${template.headerAlign};
      margin-bottom: ${sectionGap}em;
    }
    .rf-name {
      font-size: 1.95em;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: ${accent};
      margin: 0;
      line-height: 1.15;
    }
    .rf-headline {
      font-size: 1.05em;
      color: #454c56;
      margin-top: 0.15em;
    }
    .rf-contact {
      margin-top: 0.4em;
      font-size: 0.9em;
      color: #4b5563;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35em 0.75em;
      justify-content: ${template.headerAlign === 'center' ? 'center' : 'flex-start'};
    }
    .rf-contact a { color: inherit; text-decoration: none; }
    .rf-section { margin-bottom: ${sectionGap}em; }
    .rf-section:last-child { margin-bottom: 0; }
    .rf-section-title {
      font-size: 0.82em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      margin: 0 0 ${(0.55 * theme.density).toFixed(2)}em;
    }
    ${headingRules[template.headingStyle] ?? headingRules.rule}
    .rf-summary { margin: 0; color: #2f353d; }
    .rf-item { margin-bottom: ${itemGap}em; }
    .rf-item:last-child { margin-bottom: 0; }
    .rf-item-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 1em;
    }
    .rf-item-title { font-weight: 600; }
    .rf-item-sub { color: #4b5563; }
    .rf-item-meta {
      color: #6b7280;
      font-size: 0.88em;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .rf-bullets {
      margin: ${(0.25 * theme.density).toFixed(2)}em 0 0;
      padding-left: 1.15em;
    }
    .rf-bullets li { margin-bottom: ${(0.18 * theme.density).toFixed(2)}em; }
    .rf-skills-inline { margin: 0; color: #2f353d; }
    .rf-skills-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3em 0.4em;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rf-skills-tags li {
      border: 1px solid #d7dbe0;
      border-radius: 3px;
      padding: 0.1em 0.5em;
      font-size: 0.88em;
    }
    @media print {
      .rf-item, .rf-section { break-inside: avoid; }
      .rf-section-title { break-after: avoid; }
    }
  `;
}

function renderContact(resume: Resume): string {
  const { contact } = resume;
  const parts: string[] = [];

  if (contact.email) {
    parts.push(
      `<span><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></span>`
    );
  }
  if (contact.phone) parts.push(`<span>${escapeHtml(contact.phone)}</span>`);
  if (contact.location) {
    parts.push(`<span>${escapeHtml(contact.location)}</span>`);
  }
  if (contact.linkedin) {
    parts.push(`<span>${escapeHtml(stripProtocol(contact.linkedin))}</span>`);
  }
  if (contact.website) {
    parts.push(`<span>${escapeHtml(stripProtocol(contact.website))}</span>`);
  }

  if (parts.length === 0) return '';
  return `<div class="rf-contact">${parts.join('')}</div>`;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function renderSection(title: string, body: string): string {
  if (!body) return '';
  return `<section class="rf-section"><h2 class="rf-section-title">${escapeHtml(
    title
  )}</h2>${body}</section>`;
}

function renderExperience(resume: Resume): string {
  const items = resume.experience
    .filter((exp) => exp.title || exp.company)
    .map((exp) => {
      const bullets = exp.bullets.filter((b) => b.trim());
      const subParts = [exp.company, exp.location].filter(Boolean);

      return `<div class="rf-item">
        <div class="rf-item-head">
          <div>
            ${exp.title ? `<div class="rf-item-title">${escapeHtml(exp.title)}</div>` : ''}
            ${subParts.length ? `<div class="rf-item-sub">${escapeHtml(subParts.join(' · '))}</div>` : ''}
          </div>
          ${exp.duration ? `<div class="rf-item-meta">${escapeHtml(exp.duration)}</div>` : ''}
        </div>
        ${
          bullets.length
            ? `<ul class="rf-bullets">${bullets
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>`;
    })
    .join('');

  return items;
}

function renderEducation(resume: Resume): string {
  return resume.education
    .filter((edu) => edu.school || edu.degree)
    .map(
      (edu) => `<div class="rf-item">
        <div class="rf-item-head">
          <div>
            ${edu.school ? `<div class="rf-item-title">${escapeHtml(edu.school)}</div>` : ''}
            ${edu.degree ? `<div class="rf-item-sub">${escapeHtml(edu.degree)}</div>` : ''}
          </div>
          ${edu.duration ? `<div class="rf-item-meta">${escapeHtml(edu.duration)}</div>` : ''}
        </div>
      </div>`
    )
    .join('');
}

function renderSkills(resume: Resume, theme: ThemeSettings): string {
  const skills = resume.skills.filter((s) => s.trim());
  if (skills.length === 0) return '';

  if (theme.showSkillTags) {
    return `<ul class="rf-skills-tags">${skills
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('')}</ul>`;
  }

  // A single comma-separated line is the most reliably parsed form for ATS.
  return `<p class="rf-skills-inline">${escapeHtml(skills.join(' · '))}</p>`;
}

/** Renders the resume body markup. Shared by preview and print. */
export function renderResumeBody(resume: Resume, theme: ThemeSettings): string {
  const header = `<header class="rf-header">
    <h1 class="rf-name">${escapeHtml(resume.name || 'Your Name')}</h1>
    ${resume.headline ? `<div class="rf-headline">${escapeHtml(resume.headline)}</div>` : ''}
    ${renderContact(resume)}
  </header>`;

  const sections = [
    renderSection(
      'Summary',
      resume.summary
        ? `<p class="rf-summary">${escapeHtml(resume.summary)}</p>`
        : ''
    ),
    renderSection('Experience', renderExperience(resume)),
    renderSection('Education', renderEducation(resume)),
    renderSection('Skills', renderSkills(resume, theme)),
  ].join('');

  return `<div class="rf-root">${header}${sections}</div>`;
}

/**
 * Standalone document used for PDF export. Printing is triggered by the
 * caller rather than an inline script, because the extension's content
 * security policy blocks inline scripts in documents we generate.
 */
export function renderPrintDocument(
  resume: Resume,
  theme: ThemeSettings
): string {
  const title = resume.name ? `${resume.name} — Resume` : 'Resume';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: Letter; margin: 0.5in; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .rf-page { max-width: 7.5in; margin: 0 auto; }
  ${renderResumeCss(theme)}
</style>
</head>
<body>
<div class="rf-page">${renderResumeBody(resume, theme)}</div>
</body>
</html>`;
}
