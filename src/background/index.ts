import linkedinScript from '../content/linkedin?script';
import { logger } from '../lib/logger';
import type { CaptureResponse } from '../lib/types';

const EDITOR_PAGE = 'src/editor/index.html';
const EDITOR_TAB_KEY = 'resumeforge:editorTabId';
const CAPTURE_TIMEOUT_MS = 20_000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'CAPTURE_PROFILE') {
    captureProfile(message.advancedCapture !== false)
      .then((response) => sendResponse(response))
      .catch((error: unknown) =>
        sendResponse({
          error: error instanceof Error ? error.message : 'Capture failed.',
        } satisfies CaptureResponse)
      );
    return true;
  }

  if (message?.action === 'OPEN_EDITOR') {
    openEditor()
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) => {
        logger.error('Failed to open editor', error);
        sendResponse({ ok: false });
      });
    return true;
  }

  return false;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    void openEditor();
  }
});

/* ------------------------------ editor tab ------------------------------ */

/** Reuses the existing editor tab so repeated clicks do not pile up tabs. */
async function openEditor(): Promise<void> {
  const url = chrome.runtime.getURL(EDITOR_PAGE);

  try {
    const session = await chrome.storage.session.get(EDITOR_TAB_KEY);
    const existingId = session[EDITOR_TAB_KEY] as number | undefined;

    if (typeof existingId === 'number') {
      const tab = await chrome.tabs.get(existingId).catch(() => null);
      if (tab?.id) {
        await chrome.tabs.update(tab.id, { active: true });
        if (tab.windowId !== undefined) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        return;
      }
    }
  } catch (error) {
    logger.debug('Could not reuse editor tab', error);
  }

  const created = await chrome.tabs.create({ url });
  if (created.id !== undefined) {
    await chrome.storage.session.set({ [EDITOR_TAB_KEY]: created.id });
  }
}

/* -------------------------------- capture ------------------------------- */

async function captureProfile(
  advancedCapture: boolean
): Promise<CaptureResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('No active tab found.');
  }

  if (!tab.url || !/^https:\/\/([\w-]+\.)?linkedin\.com\//.test(tab.url)) {
    throw new Error(
      'Open a LinkedIn profile in the active tab, then run capture again.'
    );
  }

  if (!/\/in\//.test(tab.url)) {
    throw new Error(
      'That LinkedIn page is not a profile. Open a profile URL (linkedin.com/in/…) and try again.'
    );
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: [linkedinScript],
  });

  return requestExtraction(tab.id, advancedCapture);
}

function requestExtraction(
  tabId: number,
  advancedCapture: boolean
): Promise<CaptureResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          'LinkedIn did not respond in time. Scroll the profile to load it fully, then try again.'
        )
      );
    }, CAPTURE_TIMEOUT_MS);

    chrome.tabs.sendMessage(
      tabId,
      { action: 'EXTRACT_PROFILE', advancedCapture },
      (response: CaptureResponse | undefined) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          reject(
            new Error(
              chrome.runtime.lastError.message ??
                'Could not reach the LinkedIn page.'
            )
          );
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response?.data) {
          reject(new Error('Failed to read profile data from the page.'));
          return;
        }

        resolve({
          data: response.data,
          source: response.source,
        });
      }
    );
  });
}
