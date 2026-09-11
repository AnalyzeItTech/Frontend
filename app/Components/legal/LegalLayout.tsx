import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Footer } from '../landing/Footer';
import { OperatorBlock } from './OperatorBlock';

export const LEGAL_NAV = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refund', label: 'Refund' },
  { href: '/shipping', label: 'Shipping' },
  { href: '/products', label: 'Products' },
  { href: '/contact', label: 'Contact' },
  { href: '/security', label: 'Security' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/acceptable-use', label: 'Acceptable use' },
  { href: '/dpa', label: 'DPA' },
] as const;

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F3EDE4] dark:bg-[#171514] text-[#4A4238] dark:text-[#F4EDE5] flex flex-col transition-colors duration-300">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[#4A4238]/8 dark:border-[#3A3430]">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="AnalyzeIt"
            width={130}
            height={30}
            className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E] hover:text-[#E3836C] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/login?tab=register"
            className="hidden sm:inline-flex text-xs font-medium px-4 py-1.5 rounded-full bg-[#302824] hover:bg-[#E3836C] text-[#FFF7F1] transition-colors"
          >
            Create account
          </Link>
        </div>
      </nav>

      <main id="main-content" className="flex-1 w-full max-w-3xl mx-auto px-6 py-14 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#4A4238]/45 dark:text-[#91867E] mb-3">
          Legal
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#4A4238] dark:text-[#F4EDE5] mb-3">
          {title}
        </h1>
        {updated ? (
          <p className="text-sm text-[#4A4238]/50 dark:text-[#91867E] mb-10">
            Last updated {updated}
          </p>
        ) : (
          <div className="mb-10" />
        )}

        <article className="legal-prose space-y-8 text-sm sm:text-[15px] leading-relaxed text-[#4A4238]/80 dark:text-[#C5B9AE]">
          {children}
          <OperatorBlock />
        </article>

        <nav className="mt-16 pt-8 border-t border-[#4A4238]/10 dark:border-[#3A3430] flex flex-wrap gap-x-5 gap-y-2 text-xs font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
          {LEGAL_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[#E3836C] transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </main>

      <div className="bg-[#F3EDE4] dark:bg-[#171514]">
        <Footer />
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl text-[#4A4238] dark:text-[#F4EDE5]">{title}</h2>
      {children}
    </section>
  );
}
