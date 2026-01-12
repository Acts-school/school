"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { listFinanceQueueItems, updateFinanceQueueItem } from "@/lib/financeOfflineQueue";

async function syncQueuedPayments(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  const items = await listFinanceQueueItems();

  for (const item of items) {
    if (item.type !== "CREATE_PAYMENT") {
      continue;
    }

    if (item.status === "succeeded" || item.status === "syncing") {
      continue;
    }

    const { payload } = item;

    await updateFinanceQueueItem(item.id, {
      status: "syncing",
      lastError: null,
    });

    try {
      const body: Record<string, unknown> = {
        studentFeeId: payload.studentFeeId,
        amount: payload.amount,
        method: payload.method,
        clientRequestId: payload.clientRequestId,
      };

      if (payload.reference !== null && payload.reference.trim().length > 0) {
        body.reference = payload.reference;
      }

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        await updateFinanceQueueItem(item.id, {
          status: "failed",
          lastError: message,
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      // Consume response for completeness, but we rely on invalidation to refresh data.
      await response.json();

      await updateFinanceQueueItem(item.id, {
        status: "succeeded",
        lastError: null,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments", payload.studentFeeId] }),
        queryClient.invalidateQueries({ queryKey: ["my-student-fees"] }),
        queryClient.invalidateQueries({ queryKey: ["student-fees-by-student"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await updateFinanceQueueItem(item.id, {
        status: "failed",
        lastError: message,
      });
    }
  }
}

export function useFinanceSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const runSync = async () => {
      if (cancelled) return;
      await syncQueuedPayments(queryClient);
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
