import { useResumeStore } from '../store/resumeStore';
import { exportResumeJson, exportResumePdf } from '../lib/export';

export default function ResumePreview() {
  const resume = useResumeStore((s) => s.resume);
  const isEditMode = useResumeStore((s) => s.isEditMode);

  return (
    <div className="flex w-1/2 flex-col overflow-hidden bg-gray-100">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {isEditMode ? 'Live Preview' : 'Preview'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportResumeJson(resume)}
            className="btn-ghost text-xs"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => exportResumePdf(resume)}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="resume-canvas print-resume mx-auto max-w-none text-[11px] leading-relaxed text-gray-800">
          <header className="mb-4">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {resume.name || 'Your Name'}
            </h1>
            {resume.headline && (
              <p className="mt-0.5 text-sm text-gray-600">{resume.headline}</p>
            )}
          </header>

          {resume.summary && (
            <section className="mb-4">
              <h2 className="resume-section-title">Summary</h2>
              <p className="text-gray-700">{resume.summary}</p>
            </section>
          )}

          {resume.experience.length > 0 && (
            <section className="mb-4">
              <h2 className="resume-section-title">Experience</h2>
              <div className="space-y-3">
                {resume.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {exp.title || '—'}
                        </div>
                        <div className="text-gray-600">
                          {exp.company || 'Company'}
                        </div>
                      </div>
                      {exp.duration && (
                        <span className="shrink-0 text-[10px] text-gray-500">
                          {exp.duration}
                        </span>
                      )}
                    </div>
                    {exp.bullets.filter(Boolean).length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-gray-700">
                        {exp.bullets
                          .filter(Boolean)
                          .map((bullet, i) => (
                            <li key={i} className="mb-0.5">
                              {bullet}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.education.length > 0 && (
            <section className="mb-4">
              <h2 className="resume-section-title">Education</h2>
              <div className="space-y-2">
                {resume.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {edu.school || 'School'}
                      </div>
                      {edu.degree && (
                        <div className="text-gray-600">{edu.degree}</div>
                      )}
                    </div>
                    {edu.duration && (
                      <span className="shrink-0 text-[10px] text-gray-500">
                        {edu.duration}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resume.skills.length > 0 && (
            <section>
              <h2 className="resume-section-title">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
