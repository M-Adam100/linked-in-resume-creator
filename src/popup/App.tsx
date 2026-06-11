import { useEffect } from 'react';
import { useResumeStore } from '../store/resumeStore';
import HomeScreen from '../components/HomeScreen';
import ResumeEditor from '../components/ResumeEditor';
import ResumePreview from '../components/ResumePreview';
import PasteModal from '../components/PasteModal';
import Header from '../components/Header';

export default function App() {
  const screen = useResumeStore((s) => s.screen);
  const isPasteModalOpen = useResumeStore((s) => s.isPasteModalOpen);
  const loadFromStorage = useResumeStore((s) => s.loadFromStorage);

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="flex h-[600px] w-[800px] flex-col bg-gray-50">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        {screen === 'home' && <HomeScreen />}
        {(screen === 'editor' || screen === 'preview') && (
          <div className="flex flex-1 overflow-hidden">
            <ResumeEditor />
            <ResumePreview />
          </div>
        )}
      </main>
      {isPasteModalOpen && <PasteModal />}
    </div>
  );
}
