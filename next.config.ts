import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features for Next 15 if needed
  experimental: {
    // serverActions: { allowedOrigins: ['*'] }, // for future
  },
  images: {
    remotePatterns: [
      // Add any external image hosts for templates later
    ],
  },
  // Preserve engine compatibility notes
  webpack: (config, { isServer }) => {
    // Allow importing from scripts if needed in future
    return config;
  },
};

export default nextConfig;
