import { useState } from 'react';

import {
  needsStrongerOpener,
  applyActionVerb,
  suggestActionVerbs,
} from '../../lib/resumeBuilder';
import type { ResumeExperience } from '../../lib/types';
import { AutoTextarea } from '../AutoTextarea';
import {
  ChevronDownIcon,
  GripIcon,
  PlusIcon,
  SparkIcon,
  TrashIcon,
  XIcon,
} from '../Icons';
import { useResumeStore } from '../../store/resumeStore';

interface Props {
  experience: ResumeExperience;
  index: number;
  total: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function ExperienceItem({
  experience,
  index,
  total,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: Props) {
  const updateExperience = useResumeStore((state) => state.updateExperience);
  const removeExperience = useResumeStore((state) => state.removeExperience);
  const updateBullet = useResumeStore((state) => state.updateBullet);
  const addBullet = useResumeStore((state) => state.addBullet);
  const removeBullet = useResumeStore((state) => state.removeBullet);
  const moveBullet = useResumeStore((state) => state.moveBullet);

  const [collapsed, setCollapsed] = useState(false);
  const [verbMenuFor, setVerbMenuFor] = useState<number | null>(null);

  const heading =
    [experience.title, experience.company].filter(Boolean).join(' · ') ||
    'New role';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      className={`card p-3 transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="cursor-grab text-zinc-300 hover:text-zinc-500"
          aria-hidden="true"
        >
          <GripIcon />
        </span>
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 text-left"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
          <span className="truncate text-[13px] font-medium text-zinc-800">
            {heading}
          </span>
        </button>
        <span className="text-[11px] text-zinc-400">
          {index + 1}/{total}
        </span>
        <button
          type="button"
          className="btn-danger btn-sm"
          onClick={() => removeExperience(experience.id)}
          aria-label={`Remove ${heading}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="field-label">Job title</span>
              <input
                className="input-field"
                value={experience.title}
                placeholder="Senior Product Designer"
                onChange={(event) =>
                  updateExperience(experience.id, { title: event.target.value })
                }
              />
            </label>
            <label>
              <span className="field-label">Company</span>
              <input
                className="input-field"
                value={experience.company}
                placeholder="Acme Inc."
                onChange={(event) =>
                  updateExperience(experience.id, {
                    company: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span className="field-label">Dates</span>
              <input
                className="input-field"
                value={experience.duration}
                placeholder="Jan 2021 – Present"
                onChange={(event) =>
                  updateExperience(experience.id, {
                    duration: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span className="field-label">Location</span>
              <input
                className="input-field"
                value={experience.location}
                placeholder="Remote"
                onChange={(event) =>
                  updateExperience(experience.id, {
                    location: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div>
            <span className="field-label">Achievements</span>
            <div className="space-y-1.5">
              {experience.bullets.map((bullet, bulletIndex) => (
                <div key={bulletIndex} className="group relative">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-2 select-none text-zinc-400">•</span>
                    <AutoTextarea
                      value={bullet}
                      placeholder="Cut checkout latency by 40% by caching pricing lookups"
                      onChange={(event) =>
                        updateBullet(
                          experience.id,
                          bulletIndex,
                          event.target.value
                        )
                      }
                    />
                    <div className="flex flex-col gap-0.5 pt-1">
                      {bullet.trim() && needsStrongerOpener(bullet) && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-amber-600"
                          title="Start with a stronger verb"
                          onClick={() =>
                            setVerbMenuFor(
                              verbMenuFor === bulletIndex ? null : bulletIndex
                            )
                          }
                        >
                          <SparkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        aria-label="Remove bullet"
                        onClick={() => removeBullet(experience.id, bulletIndex)}
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                      {bulletIndex > 0 && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          aria-label="Move bullet up"
                          onClick={() =>
                            moveBullet(
                              experience.id,
                              bulletIndex,
                              bulletIndex - 1
                            )
                          }
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5 rotate-180" />
                        </button>
                      )}
                    </div>
                  </div>

                  {verbMenuFor === bulletIndex && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-4">
                      {suggestActionVerbs(bullet).map((verb) => (
                        <button
                          key={verb}
                          type="button"
                          className="chip hover:border-indigo-300 hover:bg-indigo-50"
                          onClick={() => {
                            updateBullet(
                              experience.id,
                              bulletIndex,
                              applyActionVerb(bullet, verb)
                            );
                            setVerbMenuFor(null);
                          }}
                        >
                          {verb}…
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setVerbMenuFor(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-ghost btn-sm mt-1.5"
              onClick={() => addBullet(experience.id)}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add achievement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
