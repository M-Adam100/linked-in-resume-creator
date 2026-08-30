import { logger } from './logger';
import { normalizeResume } from './normalize';
import { renderPrintDocument } from './resumeRenderer';
import { normalizeTheme } from './templates';
import type { Resume, ThemeSettings } from './types';

export const EXPORT_FORMAT_VERSION = 1;

export interface ResumeExportFile {
  format: 'resumeforge.resume';
  version: number;
  exportedAt: string;
  theme: ThemeSettings;
  resume: Resume;
}

export function buildFileBaseName(resume: Resume): string {
  const base = resume.name?.trim() || 'resume';
  const safe = base
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${safe || 'resume'}_Resume`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give Chrome time to start the download before the handle is invalidated.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ------------------------------- JSON ------------------------------- */

export function buildExportFile(
  resume: Resume,
  theme: ThemeSettings
): ResumeExportFile {
  return {
    format: 'resumeforge.resume',
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    theme,
    resume,
  };
}

export function exportResumeJson(resume: Resume, theme: ThemeSettings): void {
  const payload = JSON.stringify(buildExportFile(resume, theme), null, 2);
  triggerDownload(
    new Blob([payload], { type: 'application/json' }),
    `${buildFileBaseName(resume)}.json`
  );
}

export interface ParsedImport {
  resume: Resume;
  theme: ThemeSettings;
}

/**
 * Accepts both the wrapped export envelope and a bare resume object, so
 * files exported by the 1.0 MVP still import cleanly.
 */
export function parseResumeJson(raw: string): ParsedImport {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('That file does not contain a resume.');
  }

  const record = parsed as Record<string, unknown>;
  const resumeSource =
    record.format === 'resumeforge.resume' ? record.resume : record;

  const resume = normalizeResume(resumeSource);

  const hasContent =
    resume.name ||
    resume.headline ||
    resume.summary ||
    resume.experience.length > 0 ||
    resume.education.length > 0 ||
    resume.skills.length > 0;

  if (!hasContent) {
    throw new Error('That file does not contain any resume content.');
  }

  return {
    resume,
    theme: normalizeTheme(record.theme ?? {}),
  };
}

/* -------------------------------- PDF -------------------------------- */

/**
 * Renders the print document into a detached iframe and prints that frame.
 * Opening a popup window is unreliable inside an extension page, and blob
 * URLs inherit the extension CSP, which blocks the auto-print script.
 */
export function exportResumePdf(resume: Resume, theme: ThemeSettings): void {
  const existing = document.getElementById('resumeforge-print-frame');
  existing?.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'resumeforge-print-frame';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  iframe.addEventListener('load', () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      logger.error('Print frame unavailable');
      return;
    }

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 500);
    };

    frameWindow.addEventListener('afterprint', cleanup, { once: true });

    try {
      frameWindow.focus();
      frameWindow.print();
    } catch (error) {
      logger.error('Printing failed', error);
      iframe.remove();
      return;
    }

    // Safety net: Chrome does not always fire afterprint.
    setTimeout(cleanup, 60_000);
  });

  iframe.srcdoc = renderPrintDocument(resume, theme);
  document.body.appendChild(iframe);
}

/* -------------------------------- DOCX -------------------------------- */

export async function exportResumeDocx(
  resume: Resume,
  theme: ThemeSettings
): Promise<void> {
  // Loaded on demand so the ~500kb docx bundle stays out of the initial load.
  const { buildDocxBlob } = await import('./docx');
  const blob = await buildDocxBlob(resume, theme);
  triggerDownload(blob, `${buildFileBaseName(resume)}.docx`);
}
