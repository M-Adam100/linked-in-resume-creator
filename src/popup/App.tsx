import { useEffect, useState } from 'react';

import {
  CheckIcon,
  ExternalIcon,
  FilesIcon,
  LinkedInIcon,
  PlusIcon,
  SettingsIcon,
} from '../components/Icons';
import { captureLinkedInProfile, openEditorTab } from '../lib/messaging';
import { useActiveDocument, useResumeStore } from '../store/resumeStore';

const PROFILE_URL_RE = /^https:\/\/([\w-]+\.)?linkedin\.com\/in\//;

function useActiveTabUrl(): { url: string | null; ready: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (cancelled) return;
        // `url` is only populated for tabs we hold host permissions for,
        // which is exactly the LinkedIn case we care about.
        setUrl(tab?.url ?? null);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { url, ready };
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function App() {
  const hydrated = useResumeStore((state) => state.hydrated);
  const hydrate = useResumeStore((state) => state.hydrate);
  const documents = useResumeStore((state) => state.documents);
  const settings = useResumeStore((state) => state.settings);
  const updateSettings = useResumeStore((state) => state.updateSettings);
  const selectDocument = useResumeStore((state) => state.selectDocument);
  const createNewDocument = useResumeStore((state) => state.createNewDocument);
  const importLinkedInProfile = useResumeStore(
    (state) => state.importLinkedInProfile
  );
  const flush = useResumeStore((state) => state.flush);
  const activeDocument = useActiveDocument();

  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { url, ready } = useActiveTabUrl();
  const onProfilePage = Boolean(url && PROFILE_URL_RE.test(url));

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleCapture = async () => {
    setIsCapturing(true);
    setError(null);

    try {
      const { profile } = await captureLinkedInProfile(
        settings.advancedCapture
      );
      importLinkedInProfile(profile);
      await flush();
      await openEditorTab();
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleOpenEditor = async (documentId?: string) => {
    if (documentId) {
      selectDocument(documentId);
      await flush();
    }
    await openEditorTab();
    window.close();
  };

  const handleNewResume = async () => {
    createNewDocument();
    await flush();
    await openEditorTab();
    window.close();
  };

  const recent = [...documents]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);

  return (
    <div className="flex w-[340px] flex-col bg-white">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[13px] font-bold text-white">
            R
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-none text-zinc-900">
              ResumeForge
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              Local only · nothing uploaded
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost px-1.5 py-1.5"
          aria-label="Settings"
          aria-pressed={showSettings}
          onClick={() => setShowSettings((open) => !open)}
        >
          <SettingsIcon />
        </button>
      </header>

      {showSettings && (
        <div className="space-y-2.5 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600"
              checked={settings.advancedCapture}
              onChange={(event) =>
                updateSettings({ advancedCapture: event.target.checked })
              }
            />
            <span>
              <span className="block text-[12px] font-medium text-zinc-800">
                Advanced capture
              </span>
              <span className="block text-[11px] leading-snug text-zinc-500">
                Reads LinkedIn&apos;s own profile data for fuller descriptions
                and older roles. Turn off to use only visible page text.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600"
              checked={settings.debugLogging}
              onChange={(event) =>
                updateSettings({ debugLogging: event.target.checked })
              }
            />
            <span className="text-[12px] font-medium text-zinc-800">
              Verbose console logging
            </span>
          </label>
        </div>
      )}

      <div className="space-y-3 p-4">
        <div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={!onProfilePage || isCapturing || !hydrated}
            onClick={() => void handleCapture()}
          >
            <LinkedInIcon />
            {isCapturing ? 'Capturing…' : 'Capture this profile'}
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
            {!ready
              ? 'Checking the current tab…'
              : onProfilePage
                ? 'Reads the profile in your active tab into a new resume draft.'
                : 'Open a linkedin.com/in/… profile in this tab to capture it.'}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-2.5 py-2 text-[12px] leading-snug text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => void handleOpenEditor()}
          >
            <ExternalIcon />
            Open editor
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => void handleNewResume()}
          >
            <PlusIcon />
            New resume
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="border-t border-zinc-200 px-4 py-3">
          <div className="panel-title mb-2 flex items-center gap-1.5">
            <FilesIcon className="h-3.5 w-3.5" />
            Your resumes
          </div>
          <ul className="space-y-0.5">
            {recent.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100"
                  onClick={() => void handleOpenEditor(doc.id)}
                >
                  <span className="flex-1 truncate text-[12px] font-medium text-zinc-800">
                    {doc.label}
                  </span>
                  {activeDocument?.id === doc.id && (
                    <CheckIcon className="h-3.5 w-3.5 text-indigo-600" />
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {formatRelative(doc.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
