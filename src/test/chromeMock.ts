type StorageRecord = Record<string, unknown>;
type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  areaName: string
) => void;

interface StorageArea {
  get: (keys?: string | string[] | null) => Promise<StorageRecord>;
  set: (items: StorageRecord) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ChromeMock {
  storage: {
    local: StorageArea;
    session: StorageArea;
    onChanged: {
      addListener: (listener: ChangeListener) => void;
      removeListener: (listener: ChangeListener) => void;
    };
  };
  runtime: {
    lastError?: { message: string };
    id: string;
    getURL: (path: string) => string;
    sendMessage: (message: unknown, callback?: (res: unknown) => void) => void;
    onMessage: { addListener: (listener: unknown) => void };
    onInstalled: { addListener: (listener: unknown) => void };
    getManifest: () => { version: string };
  };
  tabs: {
    query: (info: unknown) => Promise<{ id?: number; url?: string }[]>;
    create: (info: unknown) => Promise<{ id?: number }>;
    get: (tabId: number) => Promise<{ id?: number }>;
    update: (tabId: number, info: unknown) => Promise<{ id?: number }>;
    sendMessage: (
      tabId: number,
      message: unknown,
      callback?: (res: unknown) => void
    ) => void;
  };
  __local: StorageRecord;
  __session: StorageRecord;
}

/**
 * Minimal in-memory `chrome.*` implementation. Only the surface ResumeForge
 * actually uses is modelled; anything else should fail loudly in tests.
 */
export function installChromeMock(): ChromeMock {
  const local: StorageRecord = {};
  const session: StorageRecord = {};
  const listeners = new Set<ChangeListener>();

  const notify = (
    changes: StorageRecord,
    previous: StorageRecord,
    areaName: string
  ) => {
    const payload: Record<string, { oldValue?: unknown; newValue?: unknown }> =
      {};
    for (const key of Object.keys(changes)) {
      payload[key] = { oldValue: previous[key], newValue: changes[key] };
    }
    for (const listener of listeners) listener(payload, areaName);
  };

  const createArea = (store: StorageRecord, areaName: string): StorageArea => ({
    get: (keys) => {
      if (keys === undefined || keys === null) {
        return Promise.resolve({ ...store });
      }
      const list = Array.isArray(keys) ? keys : [keys];
      const result: StorageRecord = {};
      for (const key of list) {
        if (key in store) result[key] = store[key];
      }
      return Promise.resolve(result);
    },
    set: (items) => {
      const previous = { ...store };
      Object.assign(store, structuredClone(items));
      notify(items, previous, areaName);
      return Promise.resolve();
    },
    remove: (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) delete store[key];
      return Promise.resolve();
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
      return Promise.resolve();
    },
  });

  const mock: ChromeMock = {
    storage: {
      local: createArea(local, 'local'),
      session: createArea(session, 'session'),
      onChanged: {
        addListener: (listener) => listeners.add(listener),
        removeListener: (listener) => listeners.delete(listener),
      },
    },
    runtime: {
      id: 'test-extension-id',
      getURL: (path) => `chrome-extension://test-extension-id/${path}`,
      sendMessage: (_message, callback) => callback?.({}),
      onMessage: { addListener: () => undefined },
      onInstalled: { addListener: () => undefined },
      getManifest: () => ({ version: '0.0.0-test' }),
    },
    tabs: {
      query: () => Promise.resolve([]),
      create: () => Promise.resolve({ id: 1 }),
      get: (tabId) => Promise.resolve({ id: tabId }),
      update: (tabId) => Promise.resolve({ id: tabId }),
      sendMessage: (_tabId, _message, callback) => callback?.({}),
    },
    __local: local,
    __session: session,
  };

  (globalThis as { chrome?: unknown }).chrome = mock;
  return mock;
}

export function getChromeMock(): ChromeMock {
  return (globalThis as unknown as { chrome: ChromeMock }).chrome;
}

/** Replaces the mock with an empty one; use between assertions in a test. */
export function resetChromeMock(): ChromeMock {
  return installChromeMock();
}
