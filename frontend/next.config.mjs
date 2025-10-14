/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['recharts', 'victory-vendor', 'd3-scale', 'd3-interpolate'],
  serverRuntimeConfig: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
  },
  images: {
    domains: ['localhost', 'talkcart.app', 'res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;