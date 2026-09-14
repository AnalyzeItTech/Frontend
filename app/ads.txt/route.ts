import { NextResponse } from 'next/server';

/**
 * AdSense authorization file — must be plain text at /ads.txt with no HTML shell.
 * Served via route (not public/) so we control Content-Type and avoid download headers.
 */
const BODY = 'google.com, pub-5383317547226180, DIRECT, f08c47fec0942fa0\n';

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, must-revalidate',
      // Ensure crawlers / browsers render as text, never as an attachment.
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
