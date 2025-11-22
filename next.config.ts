import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark pdf-parse, pdfkit, tesseract.js, and mindee as external for Server Components
  // pdfkit needs to be external to properly bundle font files in serverless
  // tesseract.js uses WASM and causes webpack build errors if bundled
  // mindee requires canvas (native module) which doesn't work in serverless
  serverExternalPackages: ['pdf-parse', 'pdfkit', 'tesseract.js', 'mindee', 'canvas'],
  
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

  // Webpack configuration to handle WASM modules and prevent build errors
  webpack: (config, { isServer }) => {
    // Externalize tesseract.js, mindee, and canvas to prevent webpack from processing them
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js',
        'mindee': 'commonjs mindee',
        'canvas': 'commonjs canvas',
      });
    }

    // Configure webpack to handle WASM files properly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Ignore WASM files during build analysis to prevent WasmHash errors
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
