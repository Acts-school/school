"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { useFinanceSync } from "@/hooks/useFinanceSync";

function FinanceSyncRunner() {
  useFinanceSync();
  return null;
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Ma'lumotlar 5 daqiqa "fresh" hisoblanadi
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache da 10 daqiqa saqlanadi
            gcTime: 10 * 60 * 1000, // 10 minutes
            // Xatolik bo'lsa 3 marta qayta urinadi
            retry: 3,
            // Background da avtomatik yangilanish
            refetchOnWindowFocus: false,
            // Network qayta ulanganida yangilanish
            refetchOnReconnect: true,
          },
          mutations: {
            // Mutation xatoliklarini retry qilish
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FinanceSyncRunner />
      {children}
      {/* Development muhitida DevTools ko'rsatish */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}