"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "./query-provider";
import { SocketProvider } from "./socket-provider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryProvider>
        <SocketProvider>{children}</SocketProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
