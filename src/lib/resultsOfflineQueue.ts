const DB_NAME = "emmanuelacts-results-offline-writes";
const DB_VERSION = 1;
const STORE_NAME = "resultsQueue";

type ResultOpType = "CREATE_RESULT" | "UPDATE_RESULT";

type QueueStatus = "pending" | "syncing" | "succeeded" | "failed";

interface BaseResultOperationPayload {
  score: number;
  studentId: string;
  examId?: number;
  assignmentId?: number;
  clientRequestId: string;
}

export interface CreateResultOperationPayload extends BaseResultOperationPayload {}

export interface UpdateResultOperationPayload extends BaseResultOperationPayload {
  id: number;
}

export type ResultOperationPayload =
  | CreateResultOperationPayload
  | UpdateResultOperationPayload;

export interface ResultQueueItem {
  id: string;
  type: ResultOpType;
  payload: ResultOperationPayload;
  status: QueueStatus;
  createdAt: number;
  updatedAt: number;
  lastError?: string | null;
}

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
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    void fn(store)
      .then((result) => {
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function buildQueueItem(
  type: ResultOpType,
  payload: ResultOperationPayload,
): ResultQueueItem {
  const now = Date.now();
  return {
    id: payload.clientRequestId,
    type,
    payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };
}

export async function enqueueOfflineResultCreate(
  payload: CreateResultOperationPayload,
): Promise<ResultQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline results queue is only available in the browser");
  }

  const item = buildQueueItem("CREATE_RESULT", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline result create"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function enqueueOfflineResultUpdate(
  payload: UpdateResultOperationPayload,
): Promise<ResultQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline results queue is only available in the browser");
  }

  const item = buildQueueItem("UPDATE_RESULT", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline result update"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function listResultQueueItems(): Promise<ResultQueueItem[]> {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    return await withStore<ResultQueueItem[]>("readonly", (store) => {
      return new Promise<ResultQueueItem[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          const result = (request.result ?? []) as ResultQueueItem[];
          resolve(result);
        };

        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read results queue"));
        };
      });
    });
  } catch {
    return [];
  }
}

export async function updateResultQueueItem(
  id: string,
  update: Partial<
    Pick<ResultQueueItem, "status" | "lastError" | "updatedAt" | "payload">
  >,
): Promise<void> {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    await withStore<void>("readwrite", (store) => {
      return new Promise<void>((resolve, reject) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as ResultQueueItem | undefined;
          if (!existing) {
            resolve();
            return;
          }

          const next: ResultQueueItem = {
            ...existing,
            ...update,
            updatedAt:
              typeof update.updatedAt === "number" ? update.updatedAt : Date.now(),
          };

          const putRequest = store.put(next);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(putRequest.error ?? new Error("Failed to update results queue item"));
        };

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error("Failed to read results queue item"));
        };
      });
    });
  } catch {
    // best-effort; sync will retry later
  }
}
