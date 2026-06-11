import { useResumeStore } from '../store/resumeStore';
import type { ResumeExperience } from '../lib/types';

interface Props {
  experience: ResumeExperience;
}

export default function ExperienceItem({ experience }: Props) {
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const removeExperience = useResumeStore((s) => s.removeExperience);
  const updateBullet = useResumeStore((s) => s.updateBullet);
  const addBullet = useResumeStore((s) => s.addBullet);
  const removeBullet = useResumeStore((s) => s.removeBullet);

  return (
    <div className="space-y-2 p-3">
      <input
        type="text"
        value={experience.title}
        onChange={(e) =>
          updateExperience(experience.id, { title: e.target.value })
        }
        className="input-field"
        placeholder="Job title"
      />
      <input
        type="text"
        value={experience.company}
        onChange={(e) =>
          updateExperience(experience.id, { company: e.target.value })
        }
        className="input-field"
        placeholder="Company"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={experience.duration}
          onChange={(e) =>
            updateExperience(experience.id, { duration: e.target.value })
          }
          className="input-field flex-1"
          placeholder="Duration"
        />
        <button
          type="button"
          onClick={() => removeExperience(experience.id)}
          className="btn-ghost text-red-500"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-gray-500">Bullet points</span>
        {experience.bullets.map((bullet, index) => (
          <div key={index} className="flex gap-1">
            <span className="mt-2 text-xs text-gray-400">•</span>
            <input
              type="text"
              value={bullet}
              onChange={(e) =>
                updateBullet(experience.id, index, e.target.value)
              }
              className="input-field flex-1"
              placeholder="Achievement or responsibility"
            />
            <button
              type="button"
              onClick={() => removeBullet(experience.id, index)}
              className="btn-ghost text-xs text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addBullet(experience.id)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          + Add bullet
        </button>
      </div>
    </div>
  );
}
