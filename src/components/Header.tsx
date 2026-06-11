import { useResumeStore } from '../store/resumeStore';

export default function Header() {
  const screen = useResumeStore((s) => s.screen);
  const setScreen = useResumeStore((s) => s.setScreen);
  const isEditMode = useResumeStore((s) => s.isEditMode);
  const setEditMode = useResumeStore((s) => s.setEditMode);
  const resetResume = useResumeStore((s) => s.resetResume);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          RF
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">ResumeForge</h1>
          <p className="text-xs text-gray-500">ATS-friendly resume builder</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {screen !== 'home' && (
          <>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setEditMode(true);
                  setScreen('editor');
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  isEditMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setScreen('preview');
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  !isEditMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Preview
              </button>
            </div>
            <button
              type="button"
              onClick={() => setScreen('home')}
              className="btn-ghost"
            >
              Home
            </button>
            <button
              type="button"
              onClick={resetResume}
              className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Reset
            </button>
          </>
        )}
      </div>
    </header>
  );
}
