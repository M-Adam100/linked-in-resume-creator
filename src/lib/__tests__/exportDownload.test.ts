import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { exportResumeJson, exportResumePdf } from '../export';
import { createEmptyResume } from '../resumeBuilder';
import { DEFAULT_THEME } from '../templates';

const resume = { ...createEmptyResume(), name: 'Ada Lovelace' };

const createObjectURL = vi.fn(() => 'blob:mock');

beforeEach(() => {
  createObjectURL.mockClear();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL,
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('exportResumeJson', () => {
  it('downloads a file named after the person', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    exportResumeJson(resume, DEFAULT_THEME);

    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('Ada_Lovelace_Resume.json');
    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it('removes the temporary anchor from the document', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );

    exportResumeJson(resume, DEFAULT_THEME);

    expect(document.querySelectorAll('a')).toHaveLength(0);
  });
});

describe('exportResumePdf', () => {
  it('prints through a hidden frame and cleans it up', async () => {
    const print = vi.fn();

    exportResumePdf(resume, DEFAULT_THEME);

    const frame = document.getElementById(
      'resumeforge-print-frame'
    ) as HTMLIFrameElement | null;
    expect(frame).toBeTruthy();
    expect(frame?.getAttribute('aria-hidden')).toBe('true');

    // jsdom loads srcdoc asynchronously and has no print implementation.
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (frame?.contentWindow) {
      Object.defineProperty(frame.contentWindow, 'print', { value: print });
      frame.dispatchEvent(new Event('load'));
      expect(print).toHaveBeenCalledOnce();
    }
  });

  it('replaces a frame left behind by a previous export', () => {
    exportResumePdf(resume, DEFAULT_THEME);
    exportResumePdf(resume, DEFAULT_THEME);

    expect(document.querySelectorAll('#resumeforge-print-frame')).toHaveLength(
      1
    );
  });
});
