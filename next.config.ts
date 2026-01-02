import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Fix for react-pdf
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {},
};

export default nextConfig;
