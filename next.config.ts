import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // GIS + One Tap: allow referrer on http localhost; COOP for popup/FedCM fallbacks
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
    ];
  },
};

export default nextConfig;
