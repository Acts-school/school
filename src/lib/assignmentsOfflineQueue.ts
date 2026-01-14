const DB_NAME = "emmanuelacts-assignments-offline-writes";
const DB_VERSION = 1;
const STORE_NAME = "assignmentsQueue";

type AssignmentOpType = "CREATE_ASSIGNMENT" | "UPDATE_ASSIGNMENT";

type QueueStatus = "pending" | "syncing" | "succeeded" | "failed";

// These string unions mirror Prisma enums AssessmentKind, CbcGateType, and CbcCompetency
// but are defined locally to keep this module browser-safe.
export type AssignmentKindCode = "FORMATIVE" | "SUMMATIVE" | "NATIONAL_GATE";

export type CbcGateTypeCode = "KPSEA" | "KILEA" | "SENIOR_EXIT";

export type CbcCompetencyCode =
  | "COMMUNICATION_COLLABORATION"
  | "CRITICAL_THINKING_PROBLEM_SOLVING"
  | "IMAGINATION_CREATIVITY"
  | "CITIZENSHIP"
  | "DIGITAL_LITERACY"
  | "LEARNING_TO_LEARN"
  | "SELF_EFFICACY";

interface BaseAssignmentOperationPayload {
  title: string;
  startDate: string; // ISO string
  dueDate: string; // ISO string
  lessonId: number;
  kind?: AssignmentKindCode;
  cbcGateType?: CbcGateTypeCode;
  competencies?: CbcCompetencyCode[];
  clientRequestId: string;
}

export interface CreateAssignmentOperationPayload extends BaseAssignmentOperationPayload {}

export interface UpdateAssignmentOperationPayload extends BaseAssignmentOperationPayload {
  id: number;
}

export type AssignmentOperationPayload =
  | CreateAssignmentOperationPayload
  | UpdateAssignmentOperationPayload;

export interface AssignmentQueueItem {
  id: string; // same as clientRequestId
  type: AssignmentOpType;
  payload: AssignmentOperationPayload;
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
  type: AssignmentOpType,
  payload: AssignmentOperationPayload,
): AssignmentQueueItem {
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

export async function enqueueOfflineAssignmentCreate(
  payload: CreateAssignmentOperationPayload,
): Promise<AssignmentQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline assignments queue is only available in the browser");
  }

  const item = buildQueueItem("CREATE_ASSIGNMENT", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline assignment create"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function enqueueOfflineAssignmentUpdate(
  payload: UpdateAssignmentOperationPayload,
): Promise<AssignmentQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline assignments queue is only available in the browser");
  }

  const item = buildQueueItem("UPDATE_ASSIGNMENT", payload);

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to enqueue offline assignment update"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
}

export async function listAssignmentQueueItems(): Promise<AssignmentQueueItem[]> {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    return await withStore<AssignmentQueueItem[]>("readonly", (store) => {
      return new Promise<AssignmentQueueItem[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          const result = (request.result ?? []) as AssignmentQueueItem[];
          resolve(result);
        };

        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read assignments queue"));
        };
      });
    });
  } catch {
    return [];
  }
}

export async function updateAssignmentQueueItem(
  id: string,
  update: Partial<
    Pick<AssignmentQueueItem, "status" | "lastError" | "updatedAt" | "payload">
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
          const existing = getRequest.result as AssignmentQueueItem | undefined;
          if (!existing) {
            resolve();
            return;
          }

          const next: AssignmentQueueItem = {
            ...existing,
            ...update,
            updatedAt:
              typeof update.updatedAt === "number" ? update.updatedAt : Date.now(),
          };

          const putRequest = store.put(next);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(putRequest.error ?? new Error("Failed to update assignments queue item"));
        };

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error("Failed to read assignments queue item"));
        };
      });
    });
  } catch {
    // best-effort; sync will retry later
  }
}
