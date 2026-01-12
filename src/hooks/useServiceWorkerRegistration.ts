"use client";

import { useEffect } from "react";

export function useServiceWorkerRegistration(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // Swallow registration errors in production; logging can be added later if needed.
      });
  }, []);
}
