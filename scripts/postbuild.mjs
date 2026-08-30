#!/usr/bin/env node
/**
 * Tightens the generated manifest before packaging.
 *
 * The CRX plugin exposes the injected content script's chunks to every http and
 * https origin, because it cannot know where the script will be injected. This
 * extension only ever injects into LinkedIn, so the exposure is narrowed to
 * that host — both to reduce surface area and to keep the Chrome Web Store
 * permission review straightforward.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'dist/manifest.json');

if (!existsSync(manifestPath)) {
  console.error('dist/manifest.json not found — run the build first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const allowedMatches = manifest.host_permissions ?? [];

if (Array.isArray(manifest.web_accessible_resources)) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.map(
    (entry) => ({ ...entry, matches: allowedMatches })
  );

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Narrowed web_accessible_resources to ${allowedMatches.join(', ')}`
  );
} else {
  console.log('No web_accessible_resources to narrow.');
}
