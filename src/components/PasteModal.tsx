import { useState } from 'react';

import { useResumeStore } from '../store/resumeStore';
import { useOnEscape } from './hooks';
import { XIcon } from './Icons';

interface Props {
  onClose: () => void;
}

const EXAMPLE = `Ada Lovelace
Staff Engineer at Acme

About
I build data platforms that teams actually enjoy using.

Experience
Staff Engineer
Acme Inc.
Jan 2021 - Present
Led the migration of the billing pipeline to streaming.

Education
University of Cambridge | BSc Computer Science | 2014 - 2018

Skills
TypeScript, Postgres, Kafka`;

export function PasteModal({ onClose }: Props) {
  const importPastedText = useResumeStore((state) => state.importPastedText);
  const [text, setText] = useState('');

  useOnEscape(onClose);

  const handleImport = () => {
    if (!text.trim()) return;
    importPastedText(text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-6">
      <div
        role="dialog"
        aria-label="Paste LinkedIn profile text"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-zinc-900">
              Paste profile text
            </h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              Select a LinkedIn profile in your browser, copy it, and paste it
              here. Section headings like “Experience” and “Skills” help the
              parser.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost px-1.5 py-1.5"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <textarea
            autoFocus
            className="input-field h-64 resize-none font-mono text-[12px]"
            placeholder={EXAMPLE}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <footer className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
          <span className="text-[11px] text-zinc-500">
            {text.trim()
              ? `${text.trim().split(/\s+/).length} words`
              : 'Nothing pasted yet'}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!text.trim()}
              onClick={handleImport}
            >
              Build resume
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
