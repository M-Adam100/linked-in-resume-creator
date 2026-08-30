import { useMemo, useState } from 'react';

import { renderResumeBody, renderResumeCss } from '../../lib/resumeRenderer';
import type { Resume, ThemeSettings } from '../../lib/types';

interface Props {
  resume: Resume;
  theme: ThemeSettings;
}

const ZOOM_STEPS = [0.6, 0.75, 0.9, 1];

export function PreviewPane({ resume, theme }: Props) {
  const [zoom, setZoom] = useState(0.75);

  // The preview shares its markup and stylesheet with the PDF export, so the
  // page the user sees here is the page that prints.
  const { html, css } = useMemo(
    () => ({
      html: renderResumeBody(resume, theme),
      css: renderResumeCss(theme),
    }),
    [resume, theme]
  );

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white/70 px-4 py-2">
        <span className="panel-title">Live preview</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-500">Zoom</span>
          {ZOOM_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setZoom(step)}
              aria-pressed={zoom === step}
              className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                zoom === step
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {Math.round(step * 100)}%
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-auto p-6">
        <div
          className="mx-auto"
          style={{
            width: `${8.5 * zoom}in`,
          }}
        >
          <div
            className="resume-preview-surface origin-top bg-white shadow-md ring-1 ring-zinc-300"
            style={{
              width: '8.5in',
              minHeight: '11in',
              padding: '0.5in',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              marginBottom: `calc(${11 * zoom}in - 11in)`,
            }}
          >
            <style>{css}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
    </div>
  );
}
