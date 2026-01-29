import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'coverartarchive.org' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'assets.fanart.tv' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
    ],
  },
  // We use unoptimized for the screenshot engine to bypass resizing/formatting during capture
  // but it's configured per-image in the code when needed.
};

export default nextConfig;
