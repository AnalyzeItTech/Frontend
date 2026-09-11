import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/Dashboard',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/Dashboard/:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
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
    ];
  },
};

export default nextConfig;
