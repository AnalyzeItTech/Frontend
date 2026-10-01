export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <span className="sr-only">Loading…</span>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
    </div>
  );
}
