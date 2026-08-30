import { ACCENT_PRESETS, TEMPLATE_LIST } from '../../lib/templates';
import type { ThemeSettings } from '../../lib/types';
import { useResumeStore } from '../../store/resumeStore';
import { CheckIcon } from '../Icons';
import { Drawer } from './Drawer';

interface Props {
  theme: ThemeSettings;
  onClose: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between">
        <span className="field-label mb-0">{label}</span>
        <span className="text-[11px] text-zinc-500">{format(value)}</span>
      </span>
      <input
        type="range"
        className="w-full accent-indigo-600"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function DesignPanel({ theme, onClose }: Props) {
  const updateTheme = useResumeStore((state) => state.updateTheme);

  return (
    <Drawer title="Design" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <span className="field-label">Template</span>
          <div className="space-y-1.5">
            {TEMPLATE_LIST.map((template) => {
              const selected = theme.templateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => updateTheme({ templateId: template.id })}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-zinc-900">
                      {template.name}
                    </span>
                    {selected && (
                      <CheckIcon className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="field-label">Accent</span>
          <div className="flex gap-1.5">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={theme.accentColor === preset.value}
                onClick={() => updateTheme({ accentColor: preset.value })}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  theme.accentColor === preset.value
                    ? 'scale-110 border-zinc-900'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.value }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">Typeface</span>
          <div className="flex gap-1.5">
            {(['sans', 'serif'] as const).map((family) => (
              <button
                key={family}
                type="button"
                onClick={() => updateTheme({ fontFamily: family })}
                className={`flex-1 rounded-lg border px-3 py-2 text-[13px] ${
                  theme.fontFamily === family
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                } ${family === 'serif' ? 'font-serif' : 'font-sans'}`}
              >
                {family === 'sans' ? 'Sans serif' : 'Serif'}
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Text size"
          value={theme.fontScale}
          min={0.85}
          max={1.2}
          step={0.05}
          onChange={(fontScale) => updateTheme({ fontScale })}
          format={(value) => `${Math.round(value * 100)}%`}
        />

        <Slider
          label="Spacing"
          value={theme.density}
          min={0.8}
          max={1.3}
          step={0.05}
          onChange={(density) => updateTheme({ density })}
          format={(value) =>
            value < 0.95 ? 'Tight' : value > 1.1 ? 'Roomy' : 'Balanced'
          }
        />

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600"
            checked={theme.showSkillTags}
            onChange={(event) =>
              updateTheme({ showSkillTags: event.target.checked })
            }
          />
          <span>
            <span className="block text-[12px] font-medium text-zinc-800">
              Show skills as tags
            </span>
            <span className="block text-[11px] leading-snug text-zinc-500">
              A single comma-separated line parses more reliably in applicant
              tracking systems.
            </span>
          </span>
        </label>
      </div>
    </Drawer>
  );
}
