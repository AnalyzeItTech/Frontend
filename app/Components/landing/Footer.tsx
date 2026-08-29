'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#4A4238]/10 dark:border-white/10 py-16 md:py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto">
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
          <p className="text-sm text-[#4A4238]/70 dark:text-[#EDE6DC]/70 max-w-xs leading-relaxed">
            See what your data already knows. A quiet intelligence workspace engineered for focus.
          </p>
        </div>

        {/* Product */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-white/50">
            Product
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#EDE6DC]/80">
            <li><a href="#hero" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Overview</a></li>
            <li><a href="#descent" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">3D Descent</a></li>
            <li><a href="#capabilities" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Capabilities</a></li>
            <li><a href="#how-it-works" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">How it works</a></li>
            <li><a href="#pricing" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Pricing</a></li>
          </ul>
        </div>

        {/* Workspace */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-white/50">
            Workspace
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#EDE6DC]/80">
            <li><Link href="/login" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Sign In</Link></li>
            <li><Link href="/Dashboard" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Dashboard</Link></li>
            <li><a href="mailto:hello@analyzeit.ai" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">Contact Support</a></li>
          </ul>
        </div>

        {/* Resources & Legal */}
        <div className="space-y-3 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-[#4A4238]/50 dark:text-white/50">
            Security &amp; Terms
          </div>
          <ul className="space-y-2 text-[#4A4238]/80 dark:text-[#EDE6DC]/80">
            <li><a href="#faq" className="hover:text-[#4A4238] dark:hover:text-white transition-colors">FAQ</a></li>
            <li><span className="text-[#4A4238]/60 dark:text-white/60 cursor-pointer hover:text-[#4A4238] dark:hover:text-white transition-colors">Read-Only IAM</span></li>
            <li><span className="text-[#4A4238]/60 dark:text-white/60 cursor-pointer hover:text-[#4A4238] dark:hover:text-white transition-colors">Privacy Policy</span></li>
            <li><span className="text-[#4A4238]/60 dark:text-white/60 cursor-pointer hover:text-[#4A4238] dark:hover:text-white transition-colors">Terms of Service</span></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-[#4A4238]/8 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A4238]/60 dark:text-white/60 font-mono">
        <div>© 2026 AnalyzeIt Inc. All rights reserved.</div>
        <div>Designed for calm clarity.</div>
      </div>
    </footer>
  );
};
