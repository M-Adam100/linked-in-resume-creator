import type { TemplateId, ThemeSettings } from './types';

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  /** Base body size in points; scaled by ThemeSettings.fontScale. */
  baseFontPt: number;
  /** Section heading treatment. */
  headingStyle: 'rule' | 'caps' | 'accent-bar';
  /** Name block alignment. */
  headerAlign: 'left' | 'center';
  /** Space between sections in em, scaled by density. */
  sectionGapEm: number;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description:
      'Single column with ruled headings. The safest choice for strict ATS parsers.',
    baseFontPt: 10.5,
    headingStyle: 'rule',
    headerAlign: 'left',
    sectionGapEm: 1.4,
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description:
      'Centered header with an accent bar on each section. Still parses cleanly.',
    baseFontPt: 10.5,
    headingStyle: 'accent-bar',
    headerAlign: 'center',
    sectionGapEm: 1.5,
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    description:
      'Tighter spacing and smaller type to fit a long history on one page.',
    baseFontPt: 9.5,
    headingStyle: 'caps',
    headerAlign: 'left',
    sectionGapEm: 1.05,
  },
};

export const TEMPLATE_LIST: TemplateDefinition[] = Object.values(TEMPLATES);

export const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: 'Ink', value: '#111827' },
  { label: 'Navy', value: '#1e3a8a' },
  { label: 'Teal', value: '#0f766e' },
  { label: 'Burgundy', value: '#9f1239' },
  { label: 'Slate', value: '#334155' },
];

export const DEFAULT_THEME: ThemeSettings = {
  templateId: 'classic',
  accentColor: '#111827',
  fontFamily: 'sans',
  fontScale: 1,
  density: 1,
  showSkillTags: false,
};

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? TEMPLATES.classic;
}

/** Guards against malformed persisted themes from older versions. */
export function normalizeTheme(
  theme: Partial<ThemeSettings> = {}
): ThemeSettings {
  const templateId: TemplateId =
    theme.templateId && theme.templateId in TEMPLATES
      ? theme.templateId
      : DEFAULT_THEME.templateId;

  const clamp = (
    value: number | undefined,
    min: number,
    max: number,
    fallback: number
  ) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;

  return {
    templateId,
    accentColor: /^#[0-9a-f]{6}$/i.test(theme.accentColor ?? '')
      ? (theme.accentColor as string)
      : DEFAULT_THEME.accentColor,
    fontFamily: theme.fontFamily === 'serif' ? 'serif' : 'sans',
    fontScale: clamp(theme.fontScale, 0.85, 1.2, DEFAULT_THEME.fontScale),
    density: clamp(theme.density, 0.8, 1.3, DEFAULT_THEME.density),
    showSkillTags: theme.showSkillTags ?? DEFAULT_THEME.showSkillTags,
  };
}
