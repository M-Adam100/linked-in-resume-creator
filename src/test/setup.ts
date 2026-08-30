import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import { installChromeMock } from './chromeMock';

beforeEach(() => {
  installChromeMock();
  vi.restoreAllMocks();
});
