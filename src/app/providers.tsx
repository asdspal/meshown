"use client";

import { type ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config } from "@/config/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

// ─── QueryClient singleton ────────────────────────────────────────────────────
// One instance per browser session, new instance per server render.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  if (!browserQueryClient) browserQueryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  return browserQueryClient;
}

// ─── Providers ────────────────────────────────────────────────────────────────
// React 19 + RainbowKit 2 hydration fix:
// RainbowKit reads localStorage and window.ethereum during its first render.
// Next.js App Router pre-renders 'use client' components to an HTML shell on
// the server — this produces different HTML than the client render → React #418.
//
// Fix: render a plain shell on the server, swap to the real providers only after
// the client has mounted. `mounted` starts false (same on server and client),
// flips to true in useEffect (client-only), causing a single intentional
// re-render with no hydration mismatch.
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server render + first client render: providers omitted entirely.
  // This matches perfectly — no mismatch possible.
  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  // Subsequent client renders: full provider tree with RainbowKit.
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#6366f1" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
