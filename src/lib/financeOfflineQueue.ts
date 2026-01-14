import type { PaymentMethod } from "@/lib/fees.actions";

const DB_NAME = "emmanuelacts-offline-writes";
const DB_VERSION = 1;
const STORE_NAME = "financeQueue";

type FinanceOpType = "CREATE_PAYMENT";

type QueueStatus = "pending" | "syncing" | "succeeded" | "failed";

export interface CreatePaymentOperationPayload {
  studentFeeId: string;
  amount: number; // KES, as entered by user
  method: PaymentMethod;
  reference: string | null;
  clientRequestId: string;
}

export interface FinanceQueueItem {
  id: string; // same as clientRequestId
  type: FinanceOpType;
  payload: CreatePaymentOperationPayload;
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

export async function enqueueOfflinePayment(
  payload: CreatePaymentOperationPayload,
): Promise<FinanceQueueItem> {
  if (!isBrowserEnvironment()) {
    throw new Error("Offline payment queue is only available in the browser");
  }

  const now = Date.now();
  const item: FinanceQueueItem = {
    id: payload.clientRequestId,
    type: "CREATE_PAYMENT",
    payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };

  try {
    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to enqueue offline payment"));
    });
  } catch {
    // Best-effort only: if queueing fails, the caller can still handle the error.
  }

  return item;
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

export async function listFinanceQueueItems(): Promise<FinanceQueueItem[]> {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    return await withStore<FinanceQueueItem[]>("readonly", (store) => {
      return new Promise<FinanceQueueItem[]>((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve((request.result ?? []) as FinanceQueueItem[]);
        };

        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read finance queue"));
        };
      });
    });
  } catch {
    return [];
  }
}

export async function updateFinanceQueueItem(
  id: string,
  update: Partial<Pick<FinanceQueueItem, "status" | "lastError" | "updatedAt" | "payload" >>,
): Promise<void> {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    await withStore<void>("readwrite", (store) => {
      return new Promise<void>((resolve, reject) => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as FinanceQueueItem | undefined;
          if (!existing) {
            resolve();
            return;
          }

          const next: FinanceQueueItem = {
            ...existing,
            ...update,
            updatedAt: typeof update.updatedAt === "number" ? update.updatedAt : Date.now(),
          };

          const putRequest = store.put(next);

          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update finance queue item"));
        };

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error("Failed to read finance queue item"));
        };
      });
    });
  } catch {
    // best-effort; sync will retry later
  }
}
