import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages uses the default Next.js output, not standalone.
  // The @cloudflare/next-on-pages adapter handles the build.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
