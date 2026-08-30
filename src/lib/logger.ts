/**
 * Production builds stay quiet unless the user explicitly opts into debug
 * logging, so a shared resume never leaks profile data into the console.
 */
const PREFIX = '[ResumeForge]';

let debugEnabled = false;

try {
  debugEnabled =
    import.meta.env?.DEV === true ||
    globalThis.localStorage?.getItem('resumeforge:debug') === '1';
} catch {
  debugEnabled = false;
}

export function setDebugLogging(enabled: boolean): void {
  debugEnabled = enabled;
}

export const logger = {
  debug(...args: unknown[]): void {
    if (debugEnabled) console.warn(PREFIX, ...args);
  },
  info(...args: unknown[]): void {
    if (debugEnabled) console.warn(PREFIX, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  },
};
