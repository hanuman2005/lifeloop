import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import AppRouter from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field use is on patchy mobile data; a failed fetch is usually the network
      // rather than the server, so one retry is worth it but three is not.
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
            <Toaster position="top-center" richColors closeButton />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
