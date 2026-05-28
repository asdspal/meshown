"use client";

import { type ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config } from "@/config/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

// ─── QueryClient singleton ────────────────────────────────────────────────────
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    });
  }
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    });
  }
  return browserQueryClient;
}

// ─── Providers ────────────────────────────────────────────────────────────────
// React 19 + RainbowKit 2 hydration fix (React error #418):
//
// RainbowKitProvider reads localStorage and window.ethereum during its first
// render, producing different HTML on server vs client → hard hydration crash
// in React 19.
//
// Fix: WagmiProvider and QueryClientProvider render on both server and client
// (safe — no browser APIs accessed). RainbowKitProvider is deferred until
// after client mount via the `mounted` flag, so it never runs on the server
// and never causes a content mismatch.
//
// This keeps useAccount() / useConfig() working during prerender (they need
// WagmiProvider) while eliminating the RainbowKit mismatch.
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {mounted ? (
          <RainbowKitProvider theme={darkTheme({ accentColor: "#6366f1" })}>
            {children}
          </RainbowKitProvider>
        ) : (
          // Server + first client render: no RainbowKitProvider.
          // ConnectButton won't render yet — that's fine, page shell loads first.
          children
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
