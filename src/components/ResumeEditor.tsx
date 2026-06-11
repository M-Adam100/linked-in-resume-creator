import { useState } from 'react';
import { exportResumeJson } from '../lib/export';
import { useResumeStore } from '../store/resumeStore';
import ExperienceItem from './ExperienceItem';

export default function ResumeEditor() {
  const resume = useResumeStore((s) => s.resume);
  const isEditMode = useResumeStore((s) => s.isEditMode);
  const updateResume = useResumeStore((s) => s.updateResume);
  const addExperienceEntry = useResumeStore((s) => s.addExperienceEntry);
  const addEducationEntry = useResumeStore((s) => s.addEducationEntry);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);
  const addSkill = useResumeStore((s) => s.addSkill);
  const removeSkill = useResumeStore((s) => s.removeSkill);
  const moveExperience = useResumeStore((s) => s.moveExperience);
  const [newSkill, setNewSkill] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!isEditMode) {
    return (
      <div className="flex w-1/2 items-center justify-center border-r border-gray-200 bg-gray-50 p-6">
        <p className="text-sm text-gray-500">
          Switch to Edit mode to make changes
        </p>
      </div>
    );
  }

  function handleAddSkill() {
    if (newSkill.trim()) {
      addSkill(newSkill);
      setNewSkill('');
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveExperience(dragIndex, index);
      setDragIndex(index);
    }
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="flex w-1/2 flex-col overflow-hidden border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Editor
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportResumeJson(resume)}
            className="btn-ghost text-xs"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section>
          <label className="section-label">Name</label>
          <input
            type="text"
            value={resume.name}
            onChange={(e) => updateResume({ name: e.target.value })}
            className="input-field"
            placeholder="Your full name"
          />
        </section>

        <section>
          <label className="section-label">Headline</label>
          <input
            type="text"
            value={resume.headline}
            onChange={(e) => updateResume({ headline: e.target.value })}
            className="input-field"
            placeholder="Professional headline"
          />
        </section>

        <section>
          <label className="section-label">Summary</label>
          <textarea
            value={resume.summary}
            onChange={(e) => updateResume({ summary: e.target.value })}
            rows={4}
            className="input-field resize-none"
            placeholder="Professional summary"
          />
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="section-label mb-0">Experience</label>
            <button
              type="button"
              onClick={addExperienceEntry}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {resume.experience.map((exp, index) => (
              <div
                key={exp.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`rounded-lg border border-gray-200 ${
                  dragIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="flex cursor-grab items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1">
                  <span className="text-gray-400">⠿</span>
                  <span className="text-xs text-gray-500">
                    Drag to reorder
                  </span>
                </div>
                <ExperienceItem experience={exp} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="section-label mb-0">Education</label>
            <button
              type="button"
              onClick={addEducationEntry}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <div
                key={edu.id}
                className="space-y-2 rounded-lg border border-gray-200 p-3"
              >
                <input
                  type="text"
                  value={edu.school}
                  onChange={(e) =>
                    updateEducation(edu.id, { school: e.target.value })
                  }
                  className="input-field"
                  placeholder="School"
                />
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) =>
                    updateEducation(edu.id, { degree: e.target.value })
                  }
                  className="input-field"
                  placeholder="Degree"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={edu.duration}
                    onChange={(e) =>
                      updateEducation(edu.id, { duration: e.target.value })
                    }
                    className="input-field flex-1"
                    placeholder="Duration"
                  />
                  <button
                    type="button"
                    onClick={() => removeEducation(edu.id)}
                    className="btn-ghost text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <label className="section-label">Skills</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {resume.skills.map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
              className="input-field flex-1"
              placeholder="Add a skill"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
