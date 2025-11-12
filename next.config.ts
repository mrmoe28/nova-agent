import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark pdf-parse and pdfkit as external for Server Components
  // pdfkit needs to be external to properly bundle font files in serverless
  serverExternalPackages: ['pdf-parse', 'pdfkit'],
  
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
