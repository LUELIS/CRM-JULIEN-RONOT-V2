import type { NextConfig } from "next";

// For Capacitor builds, we need static export
// But this CRM has API routes, so for mobile we use remote URL mode
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  // Use "export" for static Capacitor builds (limited features)
  // Use "standalone" for full-featured server deployment
  output: isCapacitorBuild ? "export" : "standalone",
  webpack: (config) => {
    // Fix for react-pdf
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {},
  // Skip API routes during static export
  ...(isCapacitorBuild && {
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
