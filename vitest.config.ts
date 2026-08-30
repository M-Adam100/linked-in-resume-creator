import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Coverage is measured over the deterministic logic. The excluded files
      // are thin wrappers over Chrome APIs or the live LinkedIn API, which are
      // exercised manually against a real profile instead.
      include: [
        'src/content/dom.ts',
        'src/lib/docx.ts',
        'src/lib/export.ts',
        'src/lib/ids.ts',
        'src/lib/normalize.ts',
        'src/lib/resumeBuilder.ts',
        'src/lib/resumeRenderer.ts',
        'src/lib/storage.ts',
        'src/lib/templates.ts',
        'src/store/resumeStore.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
