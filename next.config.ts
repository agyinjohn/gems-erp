import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    minimumCacheTTL: 3600, // cache images for 1 hour
  },
  allowedDevOrigins: ['192.168.100.7'],
  async headers() {
    return [
      {
        // Static assets — cache aggressively (Next.js hashes filenames)
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Public folder assets
        source: '/(:path*\.(?:ico|png|jpg|jpeg|svg|webp|woff2|woff|ttf))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        // App pages — allow stale while revalidating
        source: '/((?!api).*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, stale-while-revalidate=60' }],
      },
    ];
  },
};

export default nextConfig;
