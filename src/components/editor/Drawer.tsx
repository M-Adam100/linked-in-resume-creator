import { useOnEscape } from '../hooks';
import { XIcon } from '../Icons';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Drawer({ title, onClose, children }: Props) {
  useOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="flex-1 bg-zinc-900/20"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={title}
        className="flex w-[340px] flex-col border-l border-zinc-200 bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-[13px] font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            className="btn-ghost px-1.5 py-1.5"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon />
          </button>
        </header>
        <div className="scroll-slim flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
