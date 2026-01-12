"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  listAttendanceQueueItems,
  updateAttendanceQueueItem,
  type CreateAttendanceOperationPayload,
  type UpdateAttendanceOperationPayload,
} from "@/lib/attendanceOfflineQueue";

type AttendanceSyncResultStatus = "succeeded" | "failed";

interface AttendanceSyncResultItem {
  clientRequestId: string;
  status: AttendanceSyncResultStatus;
  errorMessage?: string | undefined;
}

interface AttendanceSyncResponse {
  results: AttendanceSyncResultItem[];
}

type AttendanceSyncOperation =
  | {
      type: "CREATE_ATTENDANCE";
      payload: CreateAttendanceOperationPayload;
    }
  | {
      type: "UPDATE_ATTENDANCE";
      payload: UpdateAttendanceOperationPayload;
    };

async function syncQueuedAttendance(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const items = await listAttendanceQueueItems();

  for (const item of items) {
    if (item.status === "succeeded" || item.status === "syncing") {
      continue;
    }

    await updateAttendanceQueueItem(item.id, {
      status: "syncing",
      lastError: null,
    });

    const operation: AttendanceSyncOperation =
      item.type === "CREATE_ATTENDANCE"
        ? {
            type: "CREATE_ATTENDANCE",
            payload: item.payload as CreateAttendanceOperationPayload,
          }
        : {
            type: "UPDATE_ATTENDANCE",
            payload: item.payload as UpdateAttendanceOperationPayload,
          };

    try {
      const response = await fetch("/api/sync/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations: [operation] }),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateAttendanceQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const data = (await response.json()) as AttendanceSyncResponse;
      const firstResult = data.results[0];

      if (!firstResult || firstResult.status !== "succeeded") {
        const message = firstResult?.errorMessage ?? "Sync failed";
        await updateAttendanceQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      await updateAttendanceQueueItem(item.id, {
        status: "succeeded",
        lastError: null,
      });

      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateAttendanceQueueItem(item.id, {
        status: "failed",
        lastError: message,
      });
    }
  }
}

export function useAttendanceSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const runSync = async () => {
      if (cancelled) return;
      await syncQueuedAttendance(queryClient);
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
