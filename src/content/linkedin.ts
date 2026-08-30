import { logger } from '../lib/logger';
import type { CaptureResponse, LinkedInProfile } from '../lib/types';
import { extractViaVoyager, mergeProfiles } from '../lib/voyager';
import { extractProfileFromDom } from './dom';

function isProfileEmpty(profile: LinkedInProfile): boolean {
  return (
    !profile.name &&
    !profile.headline &&
    profile.experience.length === 0 &&
    profile.education.length === 0 &&
    profile.skills.length === 0
  );
}

async function extractProfile(advancedCapture: boolean): Promise<{
  profile: LinkedInProfile;
  source: CaptureResponse['source'];
}> {
  const domProfile = extractProfileFromDom();

  if (!advancedCapture) {
    return { profile: domProfile, source: 'dom' };
  }

  let voyagerProfile: LinkedInProfile | null = null;

  try {
    voyagerProfile = await extractViaVoyager();
  } catch (error) {
    logger.warn('Advanced capture failed, using visible page content', error);
  }

  if (voyagerProfile && !isProfileEmpty(voyagerProfile)) {
    // The visible page is authoritative for titles the user can see; the API
    // response is richer for descriptions and older roles.
    return {
      profile: mergeProfiles(domProfile, voyagerProfile),
      source: isProfileEmpty(domProfile) ? 'voyager' : 'mixed',
    };
  }

  return { profile: domProfile, source: 'dom' };
}

/**
 * The script is injected on demand and may already be present from an earlier
 * capture, so the listener registers only once per page.
 */
const GUARD = '__resumeforgeContentReady';

if (!(window as unknown as Record<string, boolean>)[GUARD]) {
  (window as unknown as Record<string, boolean>)[GUARD] = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action !== 'EXTRACT_PROFILE') return false;

    void extractProfile(message.advancedCapture !== false)
      .then(({ profile, source }) => {
        if (isProfileEmpty(profile)) {
          sendResponse({
            error:
              'Could not read this profile. Scroll down to load the Experience section, then capture again.',
          } satisfies CaptureResponse);
          return;
        }
        sendResponse({ data: profile, source } satisfies CaptureResponse);
      })
      .catch((error: unknown) => {
        sendResponse({
          error: error instanceof Error ? error.message : 'Extraction failed.',
        } satisfies CaptureResponse);
      });

    return true;
  });
}
