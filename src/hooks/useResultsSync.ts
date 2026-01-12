"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  listResultQueueItems,
  updateResultQueueItem,
  type CreateResultOperationPayload,
  type UpdateResultOperationPayload,
} from "@/lib/resultsOfflineQueue";

type ResultSyncStatus = "succeeded" | "failed";

interface ResultSyncResultItem {
  clientRequestId: string;
  status: ResultSyncStatus;
  errorMessage?: string | undefined;
}

interface ResultSyncResponse {
  results: ResultSyncResultItem[];
}

type ResultSyncOperation =
  | {
      type: "CREATE_RESULT";
      payload: CreateResultOperationPayload;
    }
  | {
      type: "UPDATE_RESULT";
      payload: UpdateResultOperationPayload;
    };

async function syncQueuedResults(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const items = await listResultQueueItems();

  for (const item of items) {
    if (item.status === "succeeded" || item.status === "syncing") {
      continue;
    }

    await updateResultQueueItem(item.id, {
      status: "syncing",
      lastError: null,
    });

    const operation: ResultSyncOperation =
      item.type === "CREATE_RESULT"
        ? {
            type: "CREATE_RESULT",
            payload: item.payload as CreateResultOperationPayload,
          }
        : {
            type: "UPDATE_RESULT",
            payload: item.payload as UpdateResultOperationPayload,
          };

    try {
      const response = await fetch("/api/sync/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateResultQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const data = (await response.json()) as ResultSyncResponse;
      const firstResult = data.results[0];

      if (!firstResult || firstResult.status !== "succeeded") {
        const message = firstResult?.errorMessage ?? "Sync failed";
        await updateResultQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      await updateResultQueueItem(item.id, {
        status: "succeeded",
        lastError: null,
      });

      await queryClient.invalidateQueries({ queryKey: ["results"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateResultQueueItem(item.id, {
        status: "failed",
        lastError: message,
      });
    }
  }
}

export function useResultsSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const runSync = async () => {
      if (cancelled) return;
      await syncQueuedResults(queryClient);
    };

    void runSync();

    const handleOnline = () => {
      void runSync();
    };

    window.addEventListener("online", handleOnline);

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        void runSync();
      }
    }, 60_000); // every 60 seconds

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.clearInterval(intervalId);
    };
  }, [queryClient]);
}
