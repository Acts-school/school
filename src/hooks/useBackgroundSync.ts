import { useEffect, useRef, useState } from "react";

import {
  getLastSyncTimestamp,
  runBootstrapSync,
  runChangesSync,
} from "@/lib/offlineSyncClient";
import { hydrateFromBootstrapSnapshot } from "@/lib/offlineSyncHydrator";

interface BackgroundSyncState {
  lastSync: string | null;
  isSyncing: boolean;
  error: string | null;
}

interface BackgroundSyncOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export const useBackgroundSync = (
  options?: BackgroundSyncOptions,
): BackgroundSyncState => {
  const { intervalMs = 5 * 60 * 1000, enabled = true } = options ?? {};

  const [state, setState] = useState<BackgroundSyncState>({
    lastSync: null,
    isSyncing: false,
    error: null,
  });

  const intervalRef = useRef<number | null>(null);
  const initialSyncStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;

    const runInitialSync = async () => {
      if (typeof window === "undefined") {
        return;
      }

      if (initialSyncStartedRef.current) {
        return;
      }

      initialSyncStartedRef.current = true;

      setState((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        const existingLastSync = await getLastSyncTimestamp();

        if (!existingLastSync) {
          await runBootstrapSync();
          await hydrateFromBootstrapSnapshot();
        }

        const changes = await runChangesSync();

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSync: changes?.serverTime ?? existingLastSync ?? prev.lastSync,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown sync error";
          setState((prev) => ({ ...prev, isSyncing: false, error: message }));
        }
      }
    };

    void runInitialSync();

    if (intervalMs > 0 && intervalRef.current === null && typeof window !== "undefined") {
      intervalRef.current = window.setInterval(() => {
        void (async () => {
          setState((prev) => ({ ...prev, isSyncing: true, error: null }));

          try {
            const changes = await runChangesSync();

            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                isSyncing: false,
                lastSync: changes?.serverTime ?? prev.lastSync,
              }));
            }
          } catch (error) {
            if (!cancelled) {
              const message =
                error instanceof Error ? error.message : "Unknown sync error";
              setState((prev) => ({
                ...prev,
                isSyncing: false,
                error: message,
              }));
            }
          }
        })();
      }, intervalMs);
    }

    return () => {
      cancelled = true;

      if (intervalRef.current !== null && typeof window !== "undefined") {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs]);

  return state;
};
