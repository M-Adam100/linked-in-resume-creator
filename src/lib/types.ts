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
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: string[];
}

export interface ResumeExperience {
  id: string;
  title: string;
  company: string;
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
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
}

export type AppScreen = 'home' | 'editor' | 'preview';

export type MessageAction =
  | 'CAPTURE_PROFILE'
  | 'PROFILE_CAPTURED'
  | 'CAPTURE_ERROR';

export interface CaptureProfileMessage {
  action: 'CAPTURE_PROFILE';
}

export interface ProfileCapturedMessage {
  action: 'PROFILE_CAPTURED';
  data: LinkedInProfile;
}

export interface CaptureErrorMessage {
  action: 'CAPTURE_ERROR';
  error: string;
}

export type ExtensionMessage =
  | CaptureProfileMessage
  | ProfileCapturedMessage
  | CaptureErrorMessage
  | { action: 'EXTRACT_PROFILE' };
