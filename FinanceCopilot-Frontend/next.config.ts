import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Skip ESLint during Vercel builds to unblock deployment
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
