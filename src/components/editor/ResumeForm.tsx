import { useState } from 'react';

import type { Resume } from '../../lib/types';
import { useResumeStore } from '../../store/resumeStore';
import { AutoTextarea } from '../AutoTextarea';
import { PlusIcon, TrashIcon, XIcon } from '../Icons';
import { ExperienceItem } from './ExperienceItem';

interface Props {
  resume: Resume;
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ResumeForm({ resume }: Props) {
  const updateResume = useResumeStore((state) => state.updateResume);
  const updateContact = useResumeStore((state) => state.updateContact);
  const addExperienceEntry = useResumeStore(
    (state) => state.addExperienceEntry
  );
  const moveExperience = useResumeStore((state) => state.moveExperience);
  const updateEducation = useResumeStore((state) => state.updateEducation);
  const removeEducation = useResumeStore((state) => state.removeEducation);
  const addEducationEntry = useResumeStore((state) => state.addEducationEntry);
  const addSkill = useResumeStore((state) => state.addSkill);
  const removeSkill = useResumeStore((state) => state.removeSkill);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [skillDraft, setSkillDraft] = useState('');

  const handleDragOver = (overIndex: number) => {
    if (dragIndex === null || dragIndex === overIndex) return;
    moveExperience(dragIndex, overIndex);
    setDragIndex(overIndex);
  };

  const commitSkills = () => {
    const entries = skillDraft
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    entries.forEach(addSkill);
    setSkillDraft('');
  };

  return (
    <div className="space-y-6 p-5">
      <Section title="Basics">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="field-label">Full name</span>
              <input
                className="input-field"
                value={resume.name}
                placeholder="Ada Lovelace"
                onChange={(event) => updateResume({ name: event.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Headline</span>
              <input
                className="input-field"
                value={resume.headline}
                placeholder="Staff Engineer, Platform"
                onChange={(event) =>
                  updateResume({ headline: event.target.value })
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="field-label">Email</span>
              <input
                className="input-field"
                type="email"
                value={resume.contact.email}
                placeholder="ada@example.com"
                onChange={(event) =>
                  updateContact({ email: event.target.value })
                }
              />
            </label>
            <label>
              <span className="field-label">Phone</span>
              <input
                className="input-field"
                value={resume.contact.phone}
                placeholder="+1 555 0100"
                onChange={(event) =>
                  updateContact({ phone: event.target.value })
                }
              />
            </label>
            <label>
              <span className="field-label">Location</span>
              <input
                className="input-field"
                value={resume.contact.location}
                placeholder="Berlin, Germany"
                onChange={(event) =>
                  updateContact({ location: event.target.value })
                }
              />
            </label>
            <label>
              <span className="field-label">LinkedIn</span>
              <input
                className="input-field"
                value={resume.contact.linkedin}
                placeholder="linkedin.com/in/ada"
                onChange={(event) =>
                  updateContact({ linkedin: event.target.value })
                }
              />
            </label>
            <label className="col-span-2">
              <span className="field-label">Website or portfolio</span>
              <input
                className="input-field"
                value={resume.contact.website}
                placeholder="ada.dev"
                onChange={(event) =>
                  updateContact({ website: event.target.value })
                }
              />
            </label>
          </div>
        </div>
      </Section>

      <Section title="Summary">
        <AutoTextarea
          value={resume.summary}
          placeholder="Two or three lines on what you do and the results you drive."
          onChange={(event) => updateResume({ summary: event.target.value })}
        />
        <p className="text-[11px] text-zinc-500">
          {resume.summary.length} characters · aim for under 400
        </p>
      </Section>

      <Section
        title="Experience"
        action={
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={addExperienceEntry}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add role
          </button>
        }
      >
        {resume.experience.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-[12px] text-zinc-500">
            No roles yet. Capture a LinkedIn profile or add one manually.
          </p>
        ) : (
          <div className="space-y-2">
            {resume.experience.map((experience, index) => (
              <ExperienceItem
                key={experience.id}
                experience={experience}
                index={index}
                total={resume.experience.length}
                isDragging={dragIndex === index}
                onDragStart={setDragIndex}
                onDragOver={handleDragOver}
                onDragEnd={() => setDragIndex(null)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Education"
        action={
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={addEducationEntry}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add school
          </button>
        }
      >
        <div className="space-y-2">
          {resume.education.map((education) => (
            <div key={education.id} className="card p-3">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <label>
                  <span className="field-label">School</span>
                  <input
                    className="input-field"
                    value={education.school}
                    placeholder="University of Cambridge"
                    onChange={(event) =>
                      updateEducation(education.id, {
                        school: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span className="field-label">Degree</span>
                  <input
                    className="input-field"
                    value={education.degree}
                    placeholder="BSc Computer Science"
                    onChange={(event) =>
                      updateEducation(education.id, {
                        degree: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    aria-label={`Remove ${education.school || 'education entry'}`}
                    onClick={() => removeEducation(education.id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <label className="mt-2 block">
                <span className="field-label">Dates</span>
                <input
                  className="input-field"
                  value={education.duration}
                  placeholder="2014 – 2018"
                  onChange={(event) =>
                    updateEducation(education.id, {
                      duration: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1.5">
          {resume.skills.map((skill, index) => (
            <span key={`${skill}-${index}`} className="chip">
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                className="text-zinc-400 hover:text-red-600"
                onClick={() => removeSkill(index)}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          className="input-field"
          value={skillDraft}
          placeholder="Add skills, separated by commas"
          onChange={(event) => setSkillDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitSkills();
            }
          }}
          onBlur={commitSkills}
        />
      </Section>
    </div>
  );
}
