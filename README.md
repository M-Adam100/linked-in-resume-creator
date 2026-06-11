# ResumeForge

A privacy-first Chrome extension (Manifest V3) that converts LinkedIn profiles into clean, ATS-friendly resumes. Fully client-side — no backend, no private LinkedIn APIs.

## Quick start

```bash
npm install
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project

## Development

```bash
npm run dev
```

Reload the extension in `chrome://extensions` after code changes.

## Usage

1. Click the ResumeForge icon in your toolbar
2. Choose one of three entry points:
   - **Capture LinkedIn Profile** — open a LinkedIn profile, then click capture (extracts visible DOM only)
   - **Paste Profile Text** — paste copied profile content
   - **Manual Builder** — start from scratch
3. Edit your resume in the left panel; preview updates live on the right
4. Toggle **Edit / Preview** in the header
5. Export via **JSON** or **Export PDF**

## Architecture

```
src/
  popup/          React UI (home, editor, preview)
  content/        LinkedIn DOM extractor (injected on user action)
  background/     Service worker + messaging bridge
  components/     UI components
  lib/            resumeBuilder, export, storage, messaging
  store/          Zustand state + chrome.storage.local persistence
  styles/         Tailwind CSS
```

**Messaging flow:** Popup → Background → Content Script → Background → Popup

**Capture strategy (on user click):**
1. Embedded Voyager JSON already on the page
2. Voyager dash API via your logged-in session
3. Legacy `profileView` endpoint
4. DOM fallback for anything still missing

## Privacy

- No background scraping — capture runs only when you click "Capture Profile"
- Uses your existing LinkedIn session (same as the website); no credentials stored
- All resume data stored locally in `chrome.storage.local`

> **Note:** Voyager is LinkedIn's undocumented internal API. It may break or violate LinkedIn's ToS. Use at your own discretion.
