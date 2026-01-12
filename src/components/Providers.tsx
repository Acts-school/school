"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { useServiceWorkerRegistration } from "@/hooks/useServiceWorkerRegistration";
import { useAttendanceSync } from "@/hooks/useAttendanceSync";
import { useResultsSync } from "@/hooks/useResultsSync";
import { useAssignmentsSync } from "@/hooks/useAssignmentsSync";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useServiceWorkerRegistration();
  useAttendanceSync();
  useResultsSync();
  useAssignmentsSync();

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}