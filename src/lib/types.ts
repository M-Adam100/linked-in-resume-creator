export interface LinkedInExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  duration: string;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  about: string;
  location?: string;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: string[];
}

export interface ResumeContact {
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
}

export interface ResumeExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  duration: string;
  bullets: string[];
}

export interface ResumeEducation {
  id: string;
  school: string;
  degree: string;
  duration: string;
}

export interface Resume {
  name: string;
  headline: string;
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
}

export type TemplateId = 'classic' | 'modern' | 'compact';

export type FontFamilyId = 'sans' | 'serif';

export interface ThemeSettings {
  templateId: TemplateId;
  accentColor: string;
  fontFamily: FontFamilyId;
  /** Multiplier applied to the template's base font size. */
  fontScale: number;
  /** Vertical rhythm multiplier; lower fits more on one page. */
  density: number;
  showSkillTags: boolean;
}

export interface ResumeDocument {
  id: string;
  /** User-facing label for this resume, e.g. "Backend roles". */
  label: string;
  resume: Resume;
  theme: ThemeSettings;
  createdAt: number;
  updatedAt: number;
}

export interface VersionSnapshot {
  id: string;
  documentId: string;
  label: string;
  resume: Resume;
  createdAt: number;
}

export interface AppSettings {
  /** Use LinkedIn's private Voyager API in addition to visible DOM content. */
  advancedCapture: boolean;
  debugLogging: boolean;
}

export interface PersistedState {
  schemaVersion: number;
  documents: ResumeDocument[];
  activeDocumentId: string | null;
  versions: VersionSnapshot[];
  settings: AppSettings;
}

export type AppScreen = 'home' | 'editor' | 'preview';

export interface CaptureProfileMessage {
  action: 'CAPTURE_PROFILE';
}

export interface ExtractProfileMessage {
  action: 'EXTRACT_PROFILE';
  advancedCapture: boolean;
}

export interface OpenEditorMessage {
  action: 'OPEN_EDITOR';
}

export type ExtensionMessage =
  CaptureProfileMessage | ExtractProfileMessage | OpenEditorMessage;

export interface CaptureResponse {
  data?: LinkedInProfile;
  error?: string;
  /** Which extraction path produced the data, for diagnostics. */
  source?: 'voyager' | 'dom' | 'mixed';
}
