import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Let the app build even if ESLint finds errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
