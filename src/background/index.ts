import linkedinScript from '../content/linkedin?script';
import type { LinkedInProfile } from '../lib/types';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'CAPTURE_PROFILE') {
    captureProfile()
      .then((data) => sendResponse({ data }))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true;
  }
  return false;
});

async function captureProfile(): Promise<LinkedInProfile> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('No active tab found.');
  }

  if (!tab.url?.includes('linkedin.com')) {
    throw new Error(
      'Please navigate to a LinkedIn profile page and try again.'
    );
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [linkedinScript],
  });

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tab.id!,
      { action: 'EXTRACT_PROFILE' },
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
          reject(new Error('Failed to extract profile data from the page.'));
          return;
        }
        resolve(response.data as LinkedInProfile);
      }
    );
  });
}
