import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Arkiv SDK and viem are not bundled by webpack for server components.
  // They use Node.js crypto modules that fail in Edge Runtime.
  serverExternalPackages: ["@arkiv-network/sdk", "viem"],
};

export default nextConfig;
