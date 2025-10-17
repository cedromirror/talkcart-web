/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  // Transpile problematic ESM packages to avoid build issues with d3/recharts
  transpilePackages: ['recharts', 'victory-vendor', 'd3-scale', 'd3-interpolate'],
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },

  images: {
    domains: ['localhost', 'talkcart.app', 'res.cloudinary.com', 'via.placeholder.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // API proxy configuration for development
  async rewrites() {
    return {
      beforeFiles: [
        // These routes are handled by Next.js API routes, not proxied
        // (no rewrites needed, they'll be handled by pages/api/)
      ],
      afterFiles: [
        // All /api routes go to backend EXCEPT those in pages/api/
        // Note: image-proxy.ts is a Next.js API route, not proxied
        {
          source: '/api/:path((?!image-proxy).*)',
          destination: 'http://localhost:3002/api/:path*',
        },
        // Proxy HLS video segments to backend in development
        {
          source: '/hls/:path*',
          destination: 'http://localhost:3002/hls/:path*',
        },
        // Proxy Cloudinary images to avoid CORS issues
        {
          source: '/cloudinary/:path*',
          destination: 'https://res.cloudinary.com/:path*',
        },
        // Proxy local uploads to avoid CORS issues - frontend on port 4000, backend on port 8000
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:3002/uploads/:path*',
        },
        // Optional: proxy socket.io path if any component uses relative path
        {
          source: '/socket.io/:path*',
          destination: 'http://localhost:3002/socket.io/:path*',
        },
      ],
    };
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
      {
        source: '/cloudinary/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;