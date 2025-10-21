import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark pdf-parse as external for Server Components
  serverExternalPackages: ['pdf-parse'],
  
  // Temporarily disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
