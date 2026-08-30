#!/usr/bin/env node
/**
 * Zips dist/ into release/resumeforge-<version>.zip for Chrome Web Store upload.
 * Uses the system `zip` binary to avoid pulling in an archiver dependency.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(resolve(distDir, 'manifest.json'), 'utf8')
);
const zipName = `resumeforge-${manifest.version}.zip`;
const zipPath = resolve(releaseDir, zipName);

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: distDir });

console.log(`Created release/${zipName}`);
