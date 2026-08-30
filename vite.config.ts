import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import manifest from './manifest.json';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    // Source maps stay out of the shipped zip; the store review process only
    // needs readable, unminified-enough output from the build itself.
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        editor: 'src/editor/index.html',
      },
    },
  },
});
