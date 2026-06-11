import type { Resume } from './types';

export function exportResumeJson(resume: Resume): void {
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const filename = `${sanitizeFilename(resume.name || 'resume')}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'resume';
}

export function buildPrintHtml(resume: Resume): string {
  const skillsHtml = resume.skills
    .map(
      (skill) =>
        `<span class="skill-tag">${escapeHtml(skill)}</span>`
    )
    .join('');

  const experienceHtml = resume.experience
    .map(
      (exp) => `
      <div class="exp-item">
        <div class="exp-header">
          <div>
            <div class="exp-title">${escapeHtml(exp.title)}</div>
            <div class="exp-company">${escapeHtml(exp.company)}</div>
          </div>
          <div class="exp-duration">${escapeHtml(exp.duration)}</div>
        </div>
        ${
          exp.bullets.length > 0
            ? `<ul>${exp.bullets
                .filter(Boolean)
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </div>`
    )
    .join('');

  const educationHtml = resume.education
    .map(
      (edu) => `
      <div class="edu-item">
        <div class="edu-header">
          <div>
            <div class="edu-school">${escapeHtml(edu.school)}</div>
            <div class="edu-degree">${escapeHtml(edu.degree)}</div>
          </div>
          <div class="edu-duration">${escapeHtml(edu.duration)}</div>
        </div>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(resume.name || 'Resume')} - ResumeForge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 48px 56px;
      font-size: 11pt;
      line-height: 1.5;
    }
    .resume { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 22pt; font-weight: 700; letter-spacing: -0.02em; }
    .headline { font-size: 12pt; color: #444; margin-top: 4px; }
    .section { margin-top: 20px; }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #333;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .summary { color: #333; }
    .exp-item, .edu-item { margin-bottom: 14px; }
    .exp-header, .edu-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .exp-title, .edu-school { font-weight: 600; font-size: 11pt; }
    .exp-company, .edu-degree { color: #555; font-size: 10pt; }
    .exp-duration, .edu-duration {
      color: #666;
      font-size: 9pt;
      white-space: nowrap;
      flex-shrink: 0;
    }
    ul { margin-top: 4px; padding-left: 18px; }
    li { margin-bottom: 3px; color: #333; }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-tag {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 9pt;
      color: #374151;
    }
    @media print {
      body { padding: 0.5in; }
      @page { margin: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="resume">
    <header>
      <h1>${escapeHtml(resume.name || 'Your Name')}</h1>
      ${resume.headline ? `<div class="headline">${escapeHtml(resume.headline)}</div>` : ''}
    </header>

    ${
      resume.summary
        ? `<section class="section">
      <div class="section-title">Summary</div>
      <p class="summary">${escapeHtml(resume.summary)}</p>
    </section>`
        : ''
    }

    ${
      resume.experience.length > 0
        ? `<section class="section">
      <div class="section-title">Experience</div>
      ${experienceHtml}
    </section>`
        : ''
    }

    ${
      resume.education.length > 0
        ? `<section class="section">
      <div class="section-title">Education</div>
      ${educationHtml}
    </section>`
        : ''
    }

    ${
      resume.skills.length > 0
        ? `<section class="section">
      <div class="section-title">Skills</div>
      <div class="skills-grid">${skillsHtml}</div>
    </section>`
        : ''
    }
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportResumePdf(resume: Resume): void {
  const html = buildPrintHtml(resume);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url }, () => {
    URL.revokeObjectURL(url);
  });
}
