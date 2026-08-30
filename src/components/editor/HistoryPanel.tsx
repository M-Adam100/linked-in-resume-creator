import { useActiveVersions, useResumeStore } from '../../store/resumeStore';
import { HistoryIcon, TrashIcon } from '../Icons';
import { Drawer } from './Drawer';

interface Props {
  onClose: () => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function summarize(resume: {
  experience: unknown[];
  education: unknown[];
  skills: unknown[];
}): string {
  return [
    `${resume.experience.length} roles`,
    `${resume.education.length} schools`,
    `${resume.skills.length} skills`,
  ].join(' · ');
}

export function HistoryPanel({ onClose }: Props) {
  const versions = useActiveVersions();
  const restoreVersion = useResumeStore((state) => state.restoreVersion);
  const deleteVersion = useResumeStore((state) => state.deleteVersion);
  const saveVersion = useResumeStore((state) => state.saveVersion);

  return (
    <Drawer title="Version history" onClose={onClose}>
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={() => saveVersion('Manual save')}
      >
        <HistoryIcon />
        Save current version
      </button>

      <p className="mt-2 text-[11px] leading-snug text-zinc-500">
        Snapshots are also taken automatically before imports and before
        anything is deleted.
      </p>

      {versions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-300 p-4 text-center text-[12px] text-zinc-500">
          No snapshots yet for this resume.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {versions.map((version) => (
            <li key={version.id} className="card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-zinc-800">
                    {version.label}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {formatTimestamp(version.createdAt)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    {summarize(version.resume)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => restoreVersion(version.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    aria-label="Delete snapshot"
                    onClick={() => deleteVersion(version.id)}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
