"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4">An unexpected error occurred. Please try again.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
