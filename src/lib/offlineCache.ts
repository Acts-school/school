const DB_NAME = "emmanuelacts-offline";
const DB_VERSION = 1;
const STORE_NAME = "queryCache";

export type OfflineCacheEntry<T> = {
  key: string;
  value: T;
  updatedAt: number;
};

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowserEnvironment()) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

export async function setOfflineCache<T>(key: string, value: T): Promise<void> {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry: OfflineCacheEntry<T> = {
        key,
        value,
        updatedAt: Date.now(),
      };

      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to write to IndexedDB"));
    });
  } catch {
    // Swallow storage errors; offline cache is best-effort only.
  }
}

export async function getOfflineCache<T>(key: string): Promise<T | null> {
  if (!isBrowserEnvironment()) {
    return null;
  }

  try {
    const db = await openDatabase();

    const entry = await new Promise<OfflineCacheEntry<unknown> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result as OfflineCacheEntry<unknown> | undefined);
      };

      request.onerror = () => {
        reject(request.error ?? new Error("Failed to read from IndexedDB"));
      };
    });

    if (!entry) {
      return null;
    }

    return entry.value as T;
  } catch {
    return null;
  }
}
