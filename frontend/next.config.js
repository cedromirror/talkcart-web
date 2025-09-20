const path = require('path');
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  // swcMinify was removed in Next 15 and is always on
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  // Removed transpilePackages for lucide-react; it’s ESM-compatible in v0.451.0
  // Configure server runtime for better file upload handling
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },

  // Improve Fast Refresh reliability
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    domains: ['localhost', 'talkcart.app', 'res.cloudinary.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Silence monorepo root inference for output tracing
  outputFileTracingRoot: path.join(__dirname, '..'),

  // Development server configuration for better HMR
  ...(process.env.NODE_ENV === 'development' && {
    // Configure custom server for WebSocket
    compress: false,
  }),
  // API proxy configuration for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      // Proxy HLS video segments to backend in development
      {
        source: '/hls/:path*',
        destination: 'http://localhost:8000/hls/:path*',
      },
      // Optional: proxy socket.io path if any component uses relative path
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:8000/socket.io/:path*',
      },
    ];
  },
  
  // Headers for better security and CORS handling
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      // Temporarily disable CSP to test if it's causing the issue
      // {
      //   source: '/(.*)',
      //   headers: [
      //     {
      //       key: 'Content-Security-Policy',
      //       value: [
      //         "default-src 'self'",
      //         "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
      //         "connect-src 'self' https://api.stripe.com https://maps.googleapis.com ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*",
      //         "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      //         "img-src 'self' data: https: http:",
      //         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      //         "font-src 'self' https://fonts.gstatic.com",
      //       ].join('; ')
      //     },
      //   ],
      // },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Transpile/alias ESM packages for SSR on Node
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use default lucide-react ESM entry; no alias needed
      // 'lucide-react': 'lucide-react/dist/cjs',
    };

    // Improve HMR in development
    if (dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': __dirname + '/src',
      };

      // Improve webpack hot module replacement
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
      };
    }

    // Ensure Stripe.js is properly handled
    if (!isServer) {
      config.externals = config.externals || [];
      // Don't externalize Stripe.js - let webpack bundle it
      config.externals = config.externals.filter(external => {
        if (typeof external === 'string') {
          return !external.includes('@stripe');
        }
        return true;
      });
    }

    return config;
  },
};

module.exports = nextConfig;