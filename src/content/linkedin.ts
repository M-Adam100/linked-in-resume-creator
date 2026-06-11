import type { LinkedInProfile } from '../lib/types';
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

async function extractProfile(): Promise<LinkedInProfile> {
  let profile: LinkedInProfile | null = null;

  try {
    profile = await extractViaVoyager();
  } catch (err) {
    console.warn('[ResumeForge] Voyager extraction failed, using DOM fallback', err);
  }

  const domProfile = extractProfileFromDom();

  if (profile && !isProfileEmpty(profile)) {
    return mergeProfiles(domProfile, profile);
  }

  console.info('[ResumeForge] Profile captured via DOM fallback');
  return domProfile;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'EXTRACT_PROFILE') {
    void extractProfile()
      .then((data) => {
        if (isProfileEmpty(data)) {
          sendResponse({
            error:
              'Could not find profile data. Make sure you are on a LinkedIn profile page.',
          });
          return;
        }
        sendResponse({ data });
      })
      .catch((err) => {
        sendResponse({
          error: err instanceof Error ? err.message : 'Extraction failed.',
        });
      });
    return true;
  }
  return false;
});
