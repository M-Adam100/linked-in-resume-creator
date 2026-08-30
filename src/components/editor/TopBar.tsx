import type { ResumeDocument } from '../../lib/types';
import { ClipboardIcon, HistoryIcon, PaletteIcon } from '../Icons';
import { DocumentSwitcher } from './DocumentSwitcher';
import { ExportMenu } from './ExportMenu';

interface Props {
  activeDocument: ResumeDocument;
  onOpenPaste: () => void;
  onOpenDesign: () => void;
  onOpenHistory: () => void;
}

export function TopBar({
  activeDocument,
  onOpenPaste,
  onOpenDesign,
  onOpenHistory,
}: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[13px] font-bold text-white">
          R
        </div>
        <span className="hidden text-[13px] font-semibold text-zinc-900 lg:inline">
          ResumeForge
        </span>
      </div>

      <div className="mx-1 h-5 w-px bg-zinc-200" />

      <DocumentSwitcher activeDocument={activeDocument} />

      <div className="flex-1" />

      <button type="button" className="btn-secondary" onClick={onOpenPaste}>
        <ClipboardIcon />
        Paste profile
      </button>
      <button type="button" className="btn-secondary" onClick={onOpenDesign}>
        <PaletteIcon />
        Design
      </button>
      <button type="button" className="btn-secondary" onClick={onOpenHistory}>
        <HistoryIcon />
        History
      </button>

      <ExportMenu resume={activeDocument.resume} theme={activeDocument.theme} />
    </header>
  );
}
