import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="font-mono text-sm opacity-60">404</p>
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="opacity-80">The link may be old, or a shared item may have expired.</p>
      <Link href="/" className="rounded-md bg-[#E3836C] px-4 py-2 text-white hover:opacity-90">
        Go home
      </Link>
    </main>
  );
}
