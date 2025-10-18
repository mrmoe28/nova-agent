import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Mark pdf-parse as external for Server Components
  serverExternalPackages: ['pdf-parse'],
  
  // Set output file tracing root to silence workspace warning
  outputFileTracingRoot: path.join(__dirname),
  
  // Temporarily disable ESLint during build for enhanced features demo
  eslint: {
    ignoreDuringBuilds: true,
  },

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
    // Output formats for optimization (JPEG and PNG are automatically supported)
    formats: ['image/webp', 'image/avif'],
    // Enable SVG support (SVGs are passed through without optimization)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Disable static image import optimization (using external URLs)
    unoptimized: false,
  },
};

export default nextConfig;
