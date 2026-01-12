"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Optional: log to monitoring (Sentry client also captures unhandled errors automatically if configured)
    // console.error(error);
  }, [error]);

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-gray-600">Please try again. If the problem persists, contact support.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
      >
        Try again
      </button>
    </div>
  );
}
