'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '../ui/ThemeToggle';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Floating Pill Header */}
      <header className="fixed top-5 sm:top-6 left-0 right-0 z-40 flex justify-center px-4 sm:px-6 pointer-events-none">
        <nav
          className={`pointer-events-auto flex items-center justify-between gap-6 sm:gap-8 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-300 bg-[#E9DDD2] text-[#403934] border border-[#403934]/15 ${
            scrolled
              ? 'shadow-md shadow-black/10'
              : 'shadow-xs'
          }`}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group cursor-pointer"
          >
            <Image
              src="/logo.png"
              alt="AnalyzeIt"
              width={130}
              height={30}
              className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-5 text-sm font-medium tracking-wide text-[#322C28]">
            <button
              type="button"
              onClick={() => scrollTo('capabilities')}
              className="hover:text-[#C45A42] transition-colors cursor-pointer min-h-11 px-1"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="hover:text-[#C45A42] transition-colors cursor-pointer min-h-11 px-1"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollTo('comparison')}
              className="hover:text-[#C45A42] transition-colors cursor-pointer min-h-11 px-1"
            >
              Why Calm
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pricing')}
              className="hover:text-[#C45A42] transition-colors cursor-pointer min-h-11 px-1"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => scrollTo('faq')}
              className="hover:text-[#C45A42] transition-colors cursor-pointer min-h-11 px-1"
            >
              FAQ
            </button>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs text-[#403934]/80 hover:text-[#E3836C] font-medium px-3 py-1.5 transition-colors dark:text-[#F4EDE5]/80"
            >
              Sign in
            </Link>
            <Link
              href="/login?tab=register"
              className="text-xs bg-[#302824] hover:bg-[#E3836C] text-[#FFF7F1] font-medium px-4 py-1.5 rounded-full transition-all duration-200 shadow-xs"
            >
              Get started
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1 text-[#403934] cursor-pointer ml-1"
              aria-label="Toggle Menu"
            >
              <span
                className={`w-4 h-[1.5px] bg-[#403934] transition-transform ${
                  mobileMenuOpen ? 'rotate-45 translate-y-[3.5px]' : ''
                }`}
              />
              <span
                className={`w-4 h-[1.5px] bg-[#403934] transition-transform ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-[#E9DDD2]/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 text-sm font-mono tracking-widest uppercase md:hidden text-[#403934]">
          <button
            type="button"
            onClick={() => scrollTo('capabilities')}
            className="text-base text-[#403934] hover:text-[#E3836C] transition-colors"
          >
            Capabilities
          </button>
          <button
            type="button"
            onClick={() => scrollTo('how-it-works')}
            className="text-base text-[#403934] hover:text-[#E3836C] transition-colors"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollTo('comparison')}
            className="text-base text-[#403934] hover:text-[#E3836C] transition-colors"
          >
            Why Calm
          </button>
          <button
            type="button"
            onClick={() => scrollTo('pricing')}
            className="text-base text-[#403934] hover:text-[#E3836C] transition-colors"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => scrollTo('faq')}
            className="text-base text-[#403934] hover:text-[#E3836C] transition-colors"
          >
            FAQ
          </button>
          <div className="pt-4 flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-full border border-[#403934]/20 text-xs font-mono uppercase text-[#403934] hover:border-[#E3836C] hover:text-[#E3836C] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=register"
              className="px-6 py-2 rounded-full bg-[#E3836C] hover:bg-[#ED967F] text-xs font-mono uppercase text-[#FFF7F1] transition-colors shadow-xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
