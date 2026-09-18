import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Public AdSense IDs (not secrets). Baked into the client bundle at build time.
  // Vercel Environment Variables still override these if set.
  env: {
    NEXT_PUBLIC_ADSENSE_CLIENT_ID:
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-5383317547226180',
    NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN:
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN || '7279906325',
    NEXT_PUBLIC_ADSENSE_SLOT_SESSION:
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION || '7279906325',
  },
  async headers() {
    return [
      {
        source: '/ads.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
          { key: 'Content-Disposition', value: 'inline' },
        ],
      },
      {
        // GIS + One Tap: allow referrer on http localhost; COOP for popup/FedCM fallbacks
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Do NOT redirect /Dashboard ↔ /dashboard.
      // On case-insensitive macOS both paths are one folder; on Linux/Vercel
      // a permanent /Dashboard→/dashboard redirect fights Next case
      // canonicalization and causes ERR_TOO_MANY_REDIRECTS.
      {
        source: '/settings',
        destination: '/profile',
        permanent: false,
      },
      {
        source: '/settings/:path*',
        destination: '/profile',
        permanent: false,
      },
      {
        source: '/Settings',
        destination: '/profile',
        permanent: false,
      },
      {
        source: '/refunds',
        destination: '/refund',
        permanent: false,
      },
      {
        source: '/pricing',
        destination: '/products',
        permanent: false,
      },
      {
        source: '/home',
        destination: '/research',
        permanent: false,
      },
      {
        source: '/home/:path*',
        destination: '/research',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
