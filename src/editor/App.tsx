import { useEffect, useState } from 'react';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { PasteModal } from '../components/PasteModal';
import { XIcon } from '../components/Icons';
import { DesignPanel } from '../components/editor/DesignPanel';
import { HistoryPanel } from '../components/editor/HistoryPanel';
import { PreviewPane } from '../components/editor/PreviewPane';
import { ResumeForm } from '../components/editor/ResumeForm';
import { TopBar } from '../components/editor/TopBar';
import { useActiveDocument, useResumeStore } from '../store/resumeStore';

type Panel = 'design' | 'history' | null;

function Toast({
  message,
  tone,
  onDismiss,
}: {
  message: string;
  tone: 'error' | 'info';
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (tone === 'error') return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [tone, onDismiss, message]);

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] shadow-lg ${
        tone === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  const hydrate = useResumeStore((state) => state.hydrate);
  const hydrated = useResumeStore((state) => state.hydrated);
  const flush = useResumeStore((state) => state.flush);
  const error = useResumeStore((state) => state.error);
  const notice = useResumeStore((state) => state.notice);
  const setError = useResumeStore((state) => state.setError);
  const setNotice = useResumeStore((state) => state.setNotice);
  const activeDocument = useActiveDocument();

  const [panel, setPanel] = useState<Panel>(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Debounced writes must not be lost when the tab is closed mid-edit.
  useEffect(() => {
    const handler = () => {
      void flush();
    };
    window.addEventListener('beforeunload', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [flush]);

  if (!hydrated || !activeDocument) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-zinc-500">
        Loading your resumes…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        activeDocument={activeDocument}
        onOpenPaste={() => setPasteOpen(true)}
        onOpenDesign={() => setPanel('design')}
        onOpenHistory={() => setPanel('history')}
      />

      <main className="flex min-h-0 flex-1">
        <section
          aria-label="Resume content"
          className="scroll-slim w-[46%] min-w-[400px] max-w-[620px] overflow-y-auto border-r border-zinc-200 bg-white"
        >
          <ErrorBoundary area="the resume form">
            <ResumeForm resume={activeDocument.resume} />
          </ErrorBoundary>
        </section>

        <section aria-label="Preview" className="min-w-0 flex-1">
          <ErrorBoundary area="the preview">
            <PreviewPane
              resume={activeDocument.resume}
              theme={activeDocument.theme}
            />
          </ErrorBoundary>
        </section>
      </main>

      {panel === 'design' && (
        <DesignPanel
          theme={activeDocument.theme}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'history' && <HistoryPanel onClose={() => setPanel(null)} />}
      {pasteOpen && <PasteModal onClose={() => setPasteOpen(false)} />}

      {error && (
        <Toast message={error} tone="error" onDismiss={() => setError(null)} />
      )}
      {!error && notice && (
        <Toast message={notice} tone="info" onDismiss={() => setNotice(null)} />
      )}
    </div>
  );
}
