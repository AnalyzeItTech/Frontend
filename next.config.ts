import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opening the dev server as 127.0.0.1 is cross-origin to Next's default host check,
  // which blocks the HMR socket and leaves the client unhydrated.
  allowedDevOrigins: ['127.0.0.1'],
  // Public AdSense IDs — set via env at build time; no hardcoded publisher fallback.
  env: {
    ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
      ? { NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID }
      : {}),
    ...(process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN
      ? { NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN: process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_RUN }
      : {}),
    ...(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION
      ? { NEXT_PUBLIC_ADSENSE_SLOT_SESSION: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SESSION }
      : {}),
    ...(process.env.NEXT_PUBLIC_ADSENSE_SLOT_VIDEO
      ? { NEXT_PUBLIC_ADSENSE_SLOT_VIDEO: process.env.NEXT_PUBLIC_ADSENSE_SLOT_VIDEO }
      : {}),
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
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
        source: '/terms-and-conditions',
        destination: '/terms',
        permanent: false,
      },
      {
        source: '/cancellation-and-refund',
        destination: '/refund',
        permanent: false,
      },
      {
        source: '/shipping-and-exchange',
        destination: '/shipping',
        permanent: false,
      },
      {
        source: '/contact-us',
        destination: '/contact',
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
