import type { CaptureResponse, LinkedInProfile } from './types';

export interface CaptureResult {
  profile: LinkedInProfile;
  source?: CaptureResponse['source'];
}

export function captureLinkedInProfile(
  advancedCapture: boolean
): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'CAPTURE_PROFILE', advancedCapture },
      (response: CaptureResponse | undefined) => {
        if (chrome.runtime.lastError) {
          reject(
            new Error(
              chrome.runtime.lastError.message ??
                'The extension background worker is unavailable. Reload the extension and try again.'
            )
          );
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response?.data) {
          reject(new Error('No profile data received.'));
          return;
        }
        resolve({ profile: response.data, source: response.source });
      }
    );
  });
}

export function openEditorTab(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'OPEN_EDITOR' }, () => {
      // lastError is read to stop Chrome logging an unchecked error.
      void chrome.runtime.lastError;
      resolve();
    });
  });
}
