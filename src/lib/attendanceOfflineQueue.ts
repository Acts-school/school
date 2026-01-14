const DB_NAME = "emmanuelacts-attendance-offline-writes";
const DB_VERSION = 1;
const STORE_NAME = "attendanceQueue";

type AttendanceOpType = "CREATE_ATTENDANCE" | "UPDATE_ATTENDANCE";

type QueueStatus = "pending" | "syncing" | "succeeded" | "failed";

interface BaseAttendanceOperationPayload {
  date: string;
  present: boolean;
  studentId: string;
  lessonId: number;
  clientRequestId: string;
}

export interface CreateAttendanceOperationPayload
  extends BaseAttendanceOperationPayload {}

export interface UpdateAttendanceOperationPayload
  extends BaseAttendanceOperationPayload {
  id: number;
}

export type AttendanceOperationPayload =
  | CreateAttendanceOperationPayload
  | UpdateAttendanceOperationPayload;

export interface AttendanceQueueItem {
  id: string;
  type: AttendanceOpType;
  payload: AttendanceOperationPayload;
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
  type: AttendanceOpType,
  payload: AttendanceOperationPayload,
): AttendanceQueueItem {
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

export async function enqueueOfflineAttendanceCreate(
  payload: CreateAttendanceOperationPayload,
): Promise<AttendanceQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline attendance queue is only available in the browser");
  }

  const item = buildQueueItem("CREATE_ATTENDANCE", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline attendance create"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function enqueueOfflineAttendanceUpdate(
  payload: UpdateAttendanceOperationPayload,
): Promise<AttendanceQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline attendance queue is only available in the browser");
  }

  const item = buildQueueItem("UPDATE_ATTENDANCE", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline attendance update"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function listAttendanceQueueItems(): Promise<AttendanceQueueItem[]> {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    return await withStore<AttendanceQueueItem[]>("readonly", (store) => {
      return new Promise<AttendanceQueueItem[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          const result = (request.result ?? []) as AttendanceQueueItem[];
          resolve(result);
        };

        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read attendance queue"));
        };
      });
    });
  } catch {
    return [];
  }
}

export async function updateAttendanceQueueItem(
  id: string,
  update: Partial<
    Pick<AttendanceQueueItem, "status" | "lastError" | "updatedAt" | "payload">
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
          const existing = getRequest.result as AttendanceQueueItem | undefined;
          if (!existing) {
            resolve();
            return;
          }

          const next: AttendanceQueueItem = {
            ...existing,
            ...update,
            updatedAt:
              typeof update.updatedAt === "number" ? update.updatedAt : Date.now(),
          };

          const putRequest = store.put(next);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(putRequest.error ?? new Error("Failed to update attendance queue item"));
        };

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error("Failed to read attendance queue item"));
        };
      });
    });
  } catch {
    // best-effort; sync will retry later
  }
}
