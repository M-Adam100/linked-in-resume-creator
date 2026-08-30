# Chrome Web Store listing

Copy and checklist for submitting ResumeForge. Keep this in sync with
`manifest.json` and `CHANGELOG.md` before each submission.

## Listing fields

**Name** (45 char limit)

```
ResumeForge — LinkedIn to ATS Resume
```

**Short description** (132 char limit)

```
Turn a LinkedIn profile into a clean, ATS-friendly resume. Runs entirely on your device — nothing is uploaded.
```

**Category:** Productivity → Workflow & Planning
**Language:** English

**Detailed description**

```
ResumeForge turns a LinkedIn profile into a resume that applicant tracking
systems can actually read — without sending your data anywhere.

HOW IT WORKS
1. Open your LinkedIn profile and click Capture. The editor opens with your
   roles, education, and skills already filled in.
2. Edit anything. The preview beside the form is exactly what gets printed.
3. Download as PDF, Word, or JSON.

BUILT FOR ATS
• Single-column layouts, real headings, plain bullets — no tables or text boxes
  that parsers choke on
• Skills exported as one comma-separated line, the form parsers handle best
• Three templates (Classic, Modern, Compact) with control over accent colour,
  typeface, text size, and spacing

WRITE BETTER BULLETS
Bullets that open with "responsible for" or "helped with" are flagged, with
stronger verbs suggested in context. Nothing is rewritten unless you accept it —
your wording stays yours.

KEEP SEVERAL VERSIONS
Save a separate resume per role you are targeting. Version history snapshots
your work before every import and deletion, so you can always roll back.

PRIVACY BY DESIGN
• No servers, no accounts, no analytics, no telemetry
• Your resume is stored only in your browser's local extension storage
• The extension reads LinkedIn only when you click Capture
• Optional advanced capture uses LinkedIn's own profile data through your
  existing session to recover full role descriptions; turn it off to read only
  what is visible on the page

NO SIGN-UP, NO SUBSCRIPTION, NO UPSELL
Free and open source (MIT).

Note: LinkedIn's internal profile API is undocumented and may change. Use
advanced capture on your own profile and at your own discretion.
```

## Privacy practices form

- **Single purpose:** Convert a LinkedIn profile into a downloadable resume.
- **Permission justifications:**
  - `activeTab` — read the LinkedIn profile in the user's current tab when they
    click capture.
  - `scripting` — inject the extraction script into that tab on demand.
  - `storage` — save resumes locally on the user's device.
  - `host_permissions: https://www.linkedin.com/*` — restrict the extension to
    LinkedIn profile pages; the extraction request runs against LinkedIn only.
- **Remote code:** No. All code ships in the package.
- **Data collection:** None of the disclosed categories are collected or
  transmitted. Personally identifiable information entered by the user is stored
  locally only.
- **Privacy policy URL:** link to the hosted copy of `PRIVACY.md`.

## Assets needed

| Asset            | Spec              | Status                            |
| ---------------- | ----------------- | --------------------------------- |
| Icon             | 128×128 PNG       | Done — `public/icons/icon128.png` |
| Screenshots      | 1280×800, up to 5 | To capture (see shot list)        |
| Small promo tile | 440×280 PNG       | Optional                          |
| Marquee promo    | 1400×560 PNG      | Optional                          |

### Screenshot shot list

Capture at 1280×800 with a sample resume, not real personal data.

1. Editor with the form on the left and the live preview on the right.
2. The Design drawer open, showing template choice and accent colours.
3. The popup on a LinkedIn profile, with Capture enabled.
4. Version history with several snapshots.
5. The export dropdown showing PDF, Word, and JSON.

## Pre-submission checklist

- [ ] `npm run lint && npm run typecheck && npm run test:coverage` pass
- [ ] `npm run release` produces `release/resumeforge-<version>.zip`
- [ ] Version bumped in both `manifest.json` and `package.json`
- [ ] `CHANGELOG.md` entry written for this version
- [ ] Zip loads cleanly via **Load unpacked** with no console errors
- [ ] Capture verified on a real profile, with advanced capture on and off
- [ ] PDF, Word, and JSON exports open correctly in their target applications
- [ ] Exported PDF passes a resume parser check (e.g. paste-back into a job form)
- [ ] Privacy policy published at a public URL and linked in the listing
