# Changelog

All notable changes to ResumeForge are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-08-30

The MVP became a production extension: a real editor, multiple resumes,
templates, Word export, and a test suite.

### Added

- **Full-tab editor.** The popup is now a launcher; editing happens in a
  dedicated tab with a live preview beside the form.
- **Multiple resumes.** Create, rename, duplicate, and delete saved resumes,
  each with its own design settings.
- **Version history.** Snapshots are taken before imports and deletions, and on
  demand, with one-click restore.
- **Templates and theming.** Classic, Modern, and Compact layouts with accent
  colour, typeface, text size, and spacing controls. All variants stay
  single-column and ATS-parseable.
- **Word export** (`.docx`) alongside PDF and JSON, plus JSON import.
- **Contact details** on the resume: email, phone, location, LinkedIn, website.
  Detected automatically from a captured profile where possible.
- **Action-verb suggestions.** Bullets that open weakly are flagged with
  context-aware replacements, applied only when you accept them.
- **Advanced capture toggle.** Turn LinkedIn's internal profile API on or off;
  with it off, only visible page text is read.
- Error boundaries, an opt-in debug logger, storage schema versioning with
  migration from 1.0, and debounced writes.
- Test suite (110 tests), ESLint and Prettier configuration, GitHub Actions CI,
  and a release packaging script.

### Fixed

- **Duplicate roles after capture.** Merging results from several sources left
  stale copies behind because entries were keyed on both an exact and a loose
  key. Deduplication now collapses a list in place, keeping promotions at the
  same company separate.
- **Missing job titles.** Titles from the visible page now take priority, while
  descriptions come from the richer API response.
- **PDF export.** Printing no longer relies on an inline script, which the
  extension's content security policy blocked; it renders in a hidden frame
  instead.
- Preview and PDF are generated from one renderer, so what you see is what
  prints.
- Contact detection no longer reads an email's domain as a website.
- Icon paths in the manifest pointed at `public/icons/…`, which does not exist
  in the built bundle.

### Changed

- Bullets are no longer rewritten automatically on import. The original wording
  is kept and improvements are suggested instead.
- Removed the remote Google Fonts stylesheet; the UI uses system fonts so no
  requests leave the browser.

## [1.0.0] — 2026-08-29

### Added

- Initial release: capture a LinkedIn profile, paste profile text, or build a
  resume by hand; edit in the popup; export to PDF and JSON.
