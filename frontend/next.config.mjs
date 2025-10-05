/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
  images: {
    domains: ['localhost', 'talkcart.app', 'res.cloudinary.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;