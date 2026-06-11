import type { ExtensionMessage, LinkedInProfile } from './types';

export function captureLinkedInProfile(): Promise<LinkedInProfile> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'CAPTURE_PROFILE' } satisfies ExtensionMessage,
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
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
        resolve(response.data as LinkedInProfile);
      }
    );
  });
}
