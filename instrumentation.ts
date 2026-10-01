// Runs once per server instance. Many modules fall back to http://localhost:8000 when
// NEXT_PUBLIC_API_URL is unset; in production that silently points every API call at the
// visitor's own machine. Fail loudly in the logs instead.
export function register() {
  const isProd = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';
  const api = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (isProd && !api) {
    console.error(
      '[config] NEXT_PUBLIC_API_URL is not set: API calls will fall back to http://localhost:8000. ' +
        'Set it in the Vercel project environment.',
    );
  }
  if (isProd && api && /localhost|127\.0\.0\.1/.test(api)) {
    console.error(`[config] NEXT_PUBLIC_API_URL points at ${api} in production.`);
  }
}
