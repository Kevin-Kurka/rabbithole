/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable linting and type checking during build - handle separately
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: true,
  },
}

module.exports = nextConfig
