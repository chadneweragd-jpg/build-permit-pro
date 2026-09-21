/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double-mount issues with Leaflet map containers
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;
