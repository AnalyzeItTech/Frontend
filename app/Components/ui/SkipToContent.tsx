'use client';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      suppressHydrationWarning
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:px-4 focus:py-2 focus:bg-[#E3836C] focus:text-white focus:rounded-full focus:shadow-lg focus:outline-none text-xs font-mono uppercase"
    >
      Skip to main content
    </a>
  );
}
