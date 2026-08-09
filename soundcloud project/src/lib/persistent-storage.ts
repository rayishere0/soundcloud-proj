/**
 * IndexedDB-backed storage adapter for Zustand persist middleware.
 *
 * Why IndexedDB instead of localStorage?
 *  - Much larger quota (hundreds of MB vs 5-10MB)
 *  - Survives "clear history" in some browsers (Chrome keeps IndexedDB when
 *    only history is cleared, unlike localStorage which is tied to cookies/site data)
 *  - Asynchronous, non-blocking
 *  - More durable — survives browser crashes better
 *
 * This adapter implements the StateStorage interface required by Zustand's
 * persist middleware: { getItem, setItem, removeItem }.
 *
 * It also writes a backup copy to localStorage as a fallback, so if IndexedDB
 * is unavailable (private browsing in some browsers), we still have a working
 * storage. The localStorage copy is prefixed with "idb-fallback:" to avoid
 * conflicts with the old storage keys.
 */

const DB_NAME = "notsoundcloud";
const DB_VERSION = 1;
const STORE_NAME = "kv";

// In-memory cache of the last-read value so getItem is fast on subsequent calls
// (IndexedDB reads are async, but Zustand calls getItem synchronously during
// rehydration — we handle this by returning the cached value immediately if
// available, otherwise returning null and letting the async read update state).
const memoryCache = new Map<string, string | null>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function idbGet(db: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbSet(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Create a Zustand StateStorage backed by IndexedDB with a localStorage fallback.
 *
 * The adapter writes to BOTH IndexedDB (primary) and localStorage (backup),
 * so data survives even if one storage mechanism is cleared. On read, it
 * tries IndexedDB first, then falls back to localStorage.
 */
export function createPersistentStorage(keyPrefix: string) {
  const fallbackKey = `idb-fallback:${keyPrefix}`;

  return {
    async getItem(name: string): Promise<string | null> {
      const fullKey = `${keyPrefix}:${name}`;
      // Check memory cache first
      if (memoryCache.has(fullKey)) {
        return memoryCache.get(fullKey) ?? null;
      }

      // Try IndexedDB
      const db = await openDB();
      if (db) {
        const value = await idbGet(db, fullKey);
        if (value != null) {
          memoryCache.set(fullKey, value);
          // Also write to localStorage as backup
          try {
            localStorage.setItem(fallbackKey, value);
          } catch {}
          return value;
        }
      }

      // Fall back to localStorage
      try {
        const fallback = localStorage.getItem(fallbackKey);
        if (fallback != null) {
          memoryCache.set(fullKey, fallback);
          // Migrate to IndexedDB if it wasn't there
          if (db) idbSet(db, fullKey, fallback).catch(() => {});
          return fallback;
        }
      } catch {}

      return null;
    },

    async setItem(name: string, value: string): Promise<void> {
      const fullKey = `${keyPrefix}:${name}`;
      memoryCache.set(fullKey, value);

      // Write to IndexedDB (primary)
      const db = await openDB();
      if (db) {
        await idbSet(db, fullKey, value);
      }

      // Also write to localStorage as backup
      try {
        localStorage.setItem(fallbackKey, value);
      } catch {
        // localStorage might be full — that's OK, IndexedDB is the primary
      }
    },

    async removeItem(name: string): Promise<void> {
      const fullKey = `${keyPrefix}:${name}`;
      memoryCache.delete(fullKey);

      const db = await openDB();
      if (db) {
        await idbDelete(db, fullKey);
      }

      try {
        localStorage.removeItem(fallbackKey);
      } catch {}
    },
  };
}

/**
 * Export all stored data as a JSON string for backup/download.
 * Reads from both IndexedDB and localStorage.
 */
export async function exportAllData(): Promise<string> {
  const db = await openDB();
  const data: Record<string, any> = {};

  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const allKeys = await new Promise<IDBValidKey[]>((resolve) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => resolve([]);
      });
      for (const key of allKeys) {
        const value = await idbGet(db, String(key));
        if (value != null) {
          try {
            data[String(key)] = JSON.parse(value);
          } catch {
            data[String(key)] = value;
          }
        }
      }
    } catch {}
  }

  // Also include localStorage fallback keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("idb-fallback:")) {
        const value = localStorage.getItem(key);
        if (value != null && !data[key]) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }
    }
  } catch {}

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from a JSON string (e.g. from a backup file).
 * Writes to both IndexedDB and localStorage.
 */
export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  const db = await openDB();

  for (const [key, value] of Object.entries(data)) {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    // Extract the storage name from the key (format: "prefix:name")
    const colonIdx = key.indexOf(":");
    if (colonIdx === -1) continue;
    const prefix = key.slice(0, colonIdx);
    const name = key.slice(colonIdx + 1);

    // Write to IndexedDB
    if (db) {
      await idbSet(db, key, str);
    }

    // Write to localStorage fallback
    try {
      localStorage.setItem(`idb-fallback:${prefix}`, str);
    } catch {}

    // Update memory cache
    memoryCache.set(key, str);
  }
}
