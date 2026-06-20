/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
    // Next.js serves differently optimized images for different devices
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and minification
  compress: true,

  // Generate ETags for cache validation
  generateEtags: true,

  // Internationalization
  i18n: {
    locales: ['en', 'he'],
    defaultLocale: 'en',
  },

  // Production source maps disabled for bundle size
  productionBrowserSourceMaps: false,

  // Optimization for font loading
  optimizeFonts: true,

  // Enable SWR for better cache control
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@supabase/supabase-js',
      'zustand',
      'framer-motion',
    ],
    // Enable optimized React DOM
    reactRoot: true,
  },

  // Enable strict mode for better error detection
  reactStrictMode: true,

  // Allow specific modules to use ESM
  esmExternals: true,
};

module.exports = nextConfig;
