# Privacy Policy — ResumeForge

_Last updated: 30 August 2026_

ResumeForge is a Chrome extension that turns a LinkedIn profile into a resume.
It is built so that your profile and resume data never leave your computer.

## What we collect

**Nothing.** ResumeForge has no servers, no analytics, no telemetry, no crash
reporting, and no accounts. The developer cannot see your data.

## What is stored, and where

Everything is stored locally in your browser through the Chrome extension
storage API (`chrome.storage.local`), on your device only:

| Data                                                                                         | Purpose                           |
| -------------------------------------------------------------------------------------------- | --------------------------------- |
| Resume content you capture, paste, or type (name, contact details, roles, education, skills) | To show and edit your resume      |
| Saved resume documents and their version snapshots                                           | Multiple resumes and undo history |
| Template and layout preferences                                                              | To keep your chosen design        |
| Extension settings                                                                           | To remember your preferences      |

This data is never transmitted anywhere. It is not synced across devices.

## When ResumeForge reads a LinkedIn page

The extension only reads a LinkedIn page when **you** click “Capture this
profile” in its popup. There is no background monitoring and no automatic
capture. When you click capture, the extension:

1. Reads the profile content visible on the page in your active tab.
2. If “Advanced capture” is enabled (on by default), additionally requests
   profile data from LinkedIn's own internal profile endpoints **from your
   browser, using your existing LinkedIn session**, to recover full role
   descriptions and older positions that the page collapses. This request goes
   to LinkedIn and nowhere else. You can turn this off in the popup settings,
   in which case only visible page text is used.

ResumeForge does not read your LinkedIn messages, connections, feed, or any
other member's data beyond the profile page you choose to capture.

## Exporting

PDF export renders your resume in a hidden frame and hands it to Chrome's own
print dialog. Word (`.docx`) and JSON exports are generated in the browser and
saved through Chrome's normal download flow. No file is uploaded.

## Permissions and why they are needed

| Permission                            | Why                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `activeTab`                           | Read the LinkedIn profile in the tab you are on, only when you click capture |
| `scripting`                           | Inject the capture script into that tab on demand                            |
| `storage`                             | Save your resumes locally                                                    |
| `host_permissions` for `linkedin.com` | Limit the extension's reach to LinkedIn profile pages                        |

## Deleting your data

The editor's history panel lets you delete individual snapshots, and the
document menu deletes whole resumes. Removing the extension from Chrome deletes
all remaining ResumeForge data.

## A note on LinkedIn's terms

Advanced capture uses LinkedIn's private internal API from your own logged-in
session. This is not a documented or supported interface. Automated collection
of LinkedIn data may conflict with LinkedIn's User Agreement. Use ResumeForge
on your own profile and at your own risk; disable advanced capture in settings
if you prefer to read only what is visible on the page.

## Contact

Open an issue in the project repository for questions about this policy.
