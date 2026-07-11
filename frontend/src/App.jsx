import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppRoutes from "./routes/AppRoutes";
import { useAuthStore } from "./stores/authStore";
import { authService } from "./features/auth/services/authService";
import { connectSocket } from "./services/socket/connection";

export default function App() {
  const { accessToken, isAuthenticated, setUser, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Auto-login session recovery on mount
  useEffect(() => {
    async function bootstrapSession() {
      if (!accessToken || !isAuthenticated) {
        clearAuth();
        setIsInitializing(false);
        return;
      }

      try {
        const data = await authService.getCurrentUser();
        if (data.success && data.user) {
          setUser(data.user);
          connectSocket();
        } else {
          clearAuth();
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
        // Interceptor handles silent refresh. If it failed here, clear session
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    }

    bootstrapSession();
  }, [accessToken, isAuthenticated, setUser, clearAuth]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
