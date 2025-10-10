import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix workspace root detection issue
  outputFileTracingRoot: '/Users/kmk/rabbithole',

  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental features
  experimental: {
    // optimizeCss requires 'critters' package - disabled for now
    // optimizeCss: true,
    webpackBuildWorker: true,
  },
};

export default nextConfig;
