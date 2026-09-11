'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LEGAL_NAME, REGISTERED_ADDRESS } from '../../lib/legalEntity';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#4A4238]/10 dark:border-[#3A3430] py-16 md:py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto">
      {/* Top row: Brand + 4 Columns */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
        {/* Brand column */}
        <div className="col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="AnalyzeIt"
              width={140}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-[#4A4238]/70 dark:text-[#C5B9AE] max-w-xs leading-relaxed">
            See what your data already knows. A quiet intelligence workspace engineered for focus.
          </p>
        </div>

        {/* Product */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
            Product
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#C5B9AE]">
            <li><Link href="/#hero" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Overview</Link></li>
            <li><Link href="/#descent" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">3D Descent</Link></li>
            <li><Link href="/#capabilities" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Capabilities</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">How it works</Link></li>
            <li><Link href="/#pricing" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Pricing</Link></li>
          </ul>
        </div>

        {/* Workspace */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
            Workspace
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#C5B9AE]">
            <li><Link href="/login" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Sign In</Link></li>
            <li><Link href="/login?tab=register" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Create account</Link></li>
            <li><Link href="/contact" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Contact Support</Link></li>
          </ul>
        </div>

        {/* Resources & Legal */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
            Security &amp; Terms
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#C5B9AE]">
            <li><Link href="/#faq" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">FAQ</Link></li>
            <li><Link href="/security" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Security</Link></li>
            <li><Link href="/terms" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Privacy</Link></li>
            <li><Link href="/refund" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Refund</Link></li>
            <li><Link href="/shipping" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Shipping</Link></li>
            <li><Link href="/products" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Products</Link></li>
            <li><Link href="/contact" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Contact</Link></li>
            <li><Link href="/cookies" className="hover:text-[#E3836C] dark:hover:text-[#E3836C] transition-colors">Cookies</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-[#4A4238]/8 dark:border-[#3A3430] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A4238]/60 dark:text-[#91867E] font-mono">
        <div className="max-w-xl leading-relaxed">
          © {new Date().getFullYear()} AnalyzeIt. Operated by {LEGAL_NAME}, {REGISTERED_ADDRESS}.
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/security" className="hover:text-[#E3836C] transition-colors">Security</Link>
          <Link href="/acceptable-use" className="hover:text-[#E3836C] transition-colors">Acceptable use</Link>
          <Link href="/dpa" className="hover:text-[#E3836C] transition-colors">DPA</Link>
        </div>
      </div>
    </footer>
  );
};
