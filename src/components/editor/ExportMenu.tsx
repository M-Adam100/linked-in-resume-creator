import { useRef, useState } from 'react';

import {
  exportResumeDocx,
  exportResumeJson,
  exportResumePdf,
  parseResumeJson,
} from '../../lib/export';
import { logger } from '../../lib/logger';
import type { Resume, ThemeSettings } from '../../lib/types';
import { useResumeStore } from '../../store/resumeStore';
import { useClickOutside } from '../hooks';
import { ChevronDownIcon, DownloadIcon } from '../Icons';

interface Props {
  resume: Resume;
  theme: ThemeSettings;
}

export function ExportMenu({ resume, theme }: Props) {
  const importResume = useResumeStore((state) => state.importResume);
  const setError = useResumeStore((state) => state.setError);
  const setNotice = useResumeStore((state) => state.setNotice);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDocx = async () => {
    setBusy('docx');
    try {
      await exportResumeDocx(resume, theme);
      setNotice('Word document downloaded.');
    } catch (error) {
      logger.error('DOCX export failed', error);
      setError('Could not build the Word file. Try PDF export instead.');
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const { resume: imported, theme: importedTheme } = parseResumeJson(
        await file.text()
      );
      importResume(imported, importedTheme);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not read that file.'
      );
    }
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex">
        <button
          type="button"
          className="btn-primary rounded-r-none"
          onClick={() => exportResumePdf(resume, theme)}
        >
          <DownloadIcon />
          Download PDF
        </button>
        <button
          type="button"
          aria-label="More export options"
          aria-expanded={open}
          className="btn-primary rounded-l-none border-l border-indigo-500 px-1.5"
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            disabled={busy !== null}
            onClick={() => void handleDocx()}
          >
            {busy === 'docx' ? 'Building…' : 'Download Word (.docx)'}
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              exportResumeJson(resume, theme);
              setOpen(false);
            }}
          >
            Download data (.json)
          </button>

          <div className="my-1 border-t border-zinc-200" />

          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => fileInput.current?.click()}
          >
            Import from .json
          </button>
          <p className="px-3 pb-1 pt-0.5 text-[11px] leading-snug text-zinc-500">
            Replaces the content of the current resume.
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              setOpen(false);
              if (file) void handleImportFile(file);
            }}
          />
        </div>
      )}
    </div>
  );
}
