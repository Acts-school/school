"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  listAssignmentQueueItems,
  updateAssignmentQueueItem,
  type CreateAssignmentOperationPayload,
  type UpdateAssignmentOperationPayload,
} from "@/lib/assignmentsOfflineQueue";

type AssignmentSyncStatus = "succeeded" | "failed";

interface AssignmentSyncResultItem {
  clientRequestId: string;
  status: AssignmentSyncStatus;
  errorMessage?: string | undefined;
}

interface AssignmentSyncResponse {
  results: AssignmentSyncResultItem[];
}

type AssignmentSyncOperation =
  | {
      type: "CREATE_ASSIGNMENT";
      payload: CreateAssignmentOperationPayload;
    }
  | {
      type: "UPDATE_ASSIGNMENT";
      payload: UpdateAssignmentOperationPayload;
    };

async function syncQueuedAssignments(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const items = await listAssignmentQueueItems();

  for (const item of items) {
    if (item.status === "succeeded" || item.status === "syncing") {
      continue;
    }

    await updateAssignmentQueueItem(item.id, {
      status: "syncing",
      lastError: null,
    });

    const operation: AssignmentSyncOperation =
      item.type === "CREATE_ASSIGNMENT"
        ? {
            type: "CREATE_ASSIGNMENT",
            payload: item.payload as CreateAssignmentOperationPayload,
          }
        : {
            type: "UPDATE_ASSIGNMENT",
            payload: item.payload as UpdateAssignmentOperationPayload,
          };

    try {
      const response = await fetch("/api/sync/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateAssignmentQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const data = (await response.json()) as AssignmentSyncResponse;
      const firstResult = data.results[0];

      if (!firstResult || firstResult.status !== "succeeded") {
        const message = firstResult?.errorMessage ?? "Sync failed";
        await updateAssignmentQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      await updateAssignmentQueueItem(item.id, {
        status: "succeeded",
        lastError: null,
      });

      await queryClient.invalidateQueries({ queryKey: ["assignments"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateAssignmentQueueItem(item.id, {
        status: "failed",
        lastError: message,
      });
    }
  }
}

export function useAssignmentsSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const runSync = async () => {
      if (cancelled) return;
      await syncQueuedAssignments(queryClient);
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
