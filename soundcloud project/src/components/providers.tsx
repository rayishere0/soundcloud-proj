"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <SonnerToaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#f2f2f2",
          },
        }}
      />
    </QueryClientProvider>
  );
}
