import { useState } from 'react';
import { useResumeStore } from '../store/resumeStore';

export default function PasteModal() {
  const [text, setText] = useState('');
  const setPasteModalOpen = useResumeStore((s) => s.setPasteModalOpen);
  const importPastedText = useResumeStore((s) => s.importPastedText);

  function handleSubmit() {
    if (!text.trim()) return;
    importPastedText(text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          Paste LinkedIn Profile Text
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Paste copied profile content. Use section headers like About,
          Experience, Education, Skills for best results.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={`Jane Doe\nSoftware Engineer at Acme Corp\n\nAbout\nExperienced developer...\n\nExperience\nSenior Engineer\nAcme Corp\n2020 - Present\nBuilt scalable systems...\n\nEducation\nMIT | BS Computer Science | 2018\n\nSkills\nTypeScript, React, Node.js`}
          className="input-field mt-4 resize-none font-mono text-xs"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPasteModalOpen(false)}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
