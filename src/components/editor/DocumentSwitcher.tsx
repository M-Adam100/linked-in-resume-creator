import { useState } from 'react';

import type { ResumeDocument } from '../../lib/types';
import { useResumeStore } from '../../store/resumeStore';
import { useClickOutside } from '../hooks';
import {
  CheckIcon,
  ChevronDownIcon,
  FilesIcon,
  PlusIcon,
  TrashIcon,
} from '../Icons';

interface Props {
  activeDocument: ResumeDocument;
}

export function DocumentSwitcher({ activeDocument }: Props) {
  const documents = useResumeStore((state) => state.documents);
  const selectDocument = useResumeStore((state) => state.selectDocument);
  const createNewDocument = useResumeStore((state) => state.createNewDocument);
  const duplicateDocument = useResumeStore((state) => state.duplicateDocument);
  const deleteDocument = useResumeStore((state) => state.deleteDocument);
  const renameDocument = useResumeStore((state) => state.renameDocument);

  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <input
        aria-label="Resume name"
        className="w-56 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13px] font-semibold text-zinc-900 hover:border-zinc-300 focus:border-indigo-500 focus:bg-white focus:outline-none"
        value={activeDocument.label}
        onChange={(event) =>
          renameDocument(activeDocument.id, event.target.value)
        }
      />
      <button
        type="button"
        className="btn-ghost px-1.5 py-1.5"
        aria-label="Switch resume"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          <div className="panel-title flex items-center gap-1.5 px-2 py-1">
            <FilesIcon className="h-3.5 w-3.5" />
            {documents.length} saved{' '}
            {documents.length === 1 ? 'resume' : 'resumes'}
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {documents.map((doc) => (
              <li key={doc.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100"
                  onClick={() => {
                    selectDocument(doc.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1 truncate text-[12px] text-zinc-800">
                    {doc.label}
                  </span>
                  {doc.id === activeDocument.id && (
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  )}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => duplicateDocument(doc.id)}
                >
                  Copy
                </button>
                {documents.length > 1 && (
                  <button
                    type="button"
                    className="btn-danger btn-sm opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Delete ${doc.label}`}
                    onClick={() => deleteDocument(doc.id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn-ghost mt-1 w-full justify-start"
            onClick={() => {
              createNewDocument();
              setOpen(false);
            }}
          >
            <PlusIcon />
            New resume
          </button>
        </div>
      )}
    </div>
  );
}
