# ResumeForge

A privacy-first Chrome extension (Manifest V3) that turns a LinkedIn profile
into a clean, ATS-friendly resume. Everything runs on your device: no backend,
no analytics, no accounts.

- Capture the profile in your active tab, paste profile text, or build a resume
  by hand.
- Edit in a full tab with a live preview that is byte-for-byte the page you
  print.
- Keep several resumes, each with its own template, and roll back through
  version history.
- Export to PDF, Word (`.docx`), or JSON.

## Quick start

```bash
npm install
npm run build
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist` folder

## Usage

1. Open a LinkedIn profile (`linkedin.com/in/…`).
2. Click the ResumeForge icon and choose **Capture this profile**. The editor
   opens in its own tab with the imported content.
3. Edit on the left; the preview on the right updates as you type.
4. **Design** switches template, accent colour, typeface, text size, and
   spacing. **History** restores an earlier snapshot.
5. **Download PDF**, or pick Word / JSON from the dropdown beside it.

No LinkedIn profile handy? Use **Paste profile** in the editor, or just start
typing — every field is editable.

## Scripts

| Command                 | What it does                                      |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Vite dev server with hot reload for the extension |
| `npm run build`         | Typecheck, then build to `dist/`                  |
| `npm test`              | Run the test suite                                |
| `npm run test:coverage` | Tests with coverage thresholds enforced           |
| `npm run lint`          | ESLint, type-aware for `src/`                     |
| `npm run format`        | Prettier write                                    |
| `npm run icons`         | Regenerate `public/icons/*.png` from the script   |
| `npm run release`       | Build, then zip to `release/`                     |

## Architecture

```
src/
  popup/          Launcher: capture, open editor, switch resumes
  editor/         Full-tab editor page
  components/     UI, with editor/ for the editing surface
  content/        On-demand LinkedIn extraction (dom.ts)
  background/     Service worker: messaging, script injection, editor tab
  lib/            Domain logic (see below)
  store/          Zustand state, backed by chrome.storage.local
  styles/         Tailwind
```

Key modules in `src/lib`:

| Module              | Responsibility                                              |
| ------------------- | ----------------------------------------------------------- |
| `resumeBuilder.ts`  | Cleaning, bullet extraction, deduplication, contact parsing |
| `voyager.ts`        | LinkedIn internal API capture and profile merging           |
| `resumeRenderer.ts` | The single renderer used by both preview and PDF            |
| `docx.ts`           | Word export (lazy-loaded)                                   |
| `storage.ts`        | Schema versioning, migrations, debounced persistence        |
| `templates.ts`      | Template definitions and theme normalisation                |

**Messaging flow:** popup → background → content script → background → popup.

**Capture strategy**, all triggered by a click and merged, with the visible page
winning on job titles and the API winning on descriptions:

1. Voyager JSON already embedded in the page
2. Voyager dash profile endpoints via your logged-in session
3. Legacy `profileView` endpoint
4. Visible DOM

Set **Advanced capture** off in the popup to use step 4 only.

### One renderer for preview and export

`resumeRenderer.ts` produces the resume markup and its stylesheet. The editor
injects that output into the preview pane; PDF export loads the same output into
a hidden frame and prints it. There is no second layout implementation to drift
out of sync.

### Storage and migrations

State lives under one key (`resumeforge:state`) with a `schemaVersion`. Reads go
through `normalizeState`, which coerces every field, so a partially written or
hand-edited value degrades instead of crashing. A 1.0 install (single resume
under `resumeforge_resume`) is migrated on first load.

## Testing

```bash
npm test
```

110 tests cover resume processing, deduplication, the DOM extractor against a
LinkedIn-shaped fixture, storage migrations, the renderer, exports, and the
store. Coverage thresholds are enforced over that logic; the thin wrappers over
Chrome and LinkedIn APIs are verified by hand against a real profile.

## Privacy

- Capture runs only when you click it — there is no background monitoring.
- Requests use your existing LinkedIn session; no credentials are stored.
- All data stays in `chrome.storage.local`. Nothing is uploaded, ever.

Full details in [PRIVACY.md](./PRIVACY.md).

> **Note:** Voyager is LinkedIn's undocumented internal API. It can break
> without warning, and automated collection may conflict with LinkedIn's User
> Agreement. Use it on your own profile, at your own discretion, or turn
> advanced capture off.

## Releasing

```bash
npm run release   # build + release/resumeforge-<version>.zip
```

Store listing copy and the submission checklist are in
[docs/store-listing.md](./docs/store-listing.md).

## License

[MIT](./LICENSE)
