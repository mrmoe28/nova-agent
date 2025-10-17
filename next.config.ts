import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains for scraped images
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP domains (for local dev)
      },
    ],
    // Increase device sizes for better responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Increase image sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow SVG format
    formats: ['image/webp', 'image/avif'],
    // Disable static image import optimization (using external URLs)
    unoptimized: false,
  },
};

export default nextConfig;
