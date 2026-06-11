import { useResumeStore } from '../store/resumeStore';
import { captureLinkedInProfile } from '../lib/messaging';

export default function HomeScreen() {
  const isLoading = useResumeStore((s) => s.isLoading);
  const error = useResumeStore((s) => s.error);
  const setLoading = useResumeStore((s) => s.setLoading);
  const setError = useResumeStore((s) => s.setError);
  const importLinkedInProfile = useResumeStore((s) => s.importLinkedInProfile);
  const setPasteModalOpen = useResumeStore((s) => s.setPasteModalOpen);
  const startManualBuilder = useResumeStore((s) => s.startManualBuilder);
  const resume = useResumeStore((s) => s.resume);
  const setScreen = useResumeStore((s) => s.setScreen);

  const hasExistingResume =
    resume.name || resume.experience.length > 0 || resume.skills.length > 0;

  async function handleCapture() {
    setLoading(true);
    setError(null);
    try {
      const profile = await captureLinkedInProfile();
      importLinkedInProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Capture failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Build your ATS resume
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Capture from LinkedIn, paste profile text, or build manually. All
            data stays on your device.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Capturing…' : 'Capture LinkedIn Profile'}
          </button>
          <button
            type="button"
            onClick={() => setPasteModalOpen(true)}
            className="btn-secondary"
          >
            Paste Profile Text
          </button>
          <button
            type="button"
            onClick={startManualBuilder}
            className="btn-secondary"
          >
            Manual Builder
          </button>
          {hasExistingResume && (
            <button
              type="button"
              onClick={() => setScreen('editor')}
              className="btn-ghost w-full text-blue-600"
            >
              Continue editing saved resume →
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Capture tries Voyager API first (your active session), then falls back
          to visible DOM. User-triggered only — no background scraping.
        </p>
      </div>
    </div>
  );
}
