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
          className={`pointer-events-auto flex items-center justify-between gap-6 sm:gap-8 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-300 ${
            scrolled
              ? 'glass-pill shadow-sm border border-[#4A4238]/10'
              : 'bg-[#F3EDE4]/60 backdrop-blur-md border border-[#4A4238]/8'
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
          <div className="hidden md:flex items-center gap-6 text-xs font-mono tracking-wider uppercase text-[#4A4238]/70">
            <button
              type="button"
              onClick={() => scrollTo('capabilities')}
              className="hover:text-[#4A4238] transition-colors cursor-pointer"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="hover:text-[#4A4238] transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollTo('comparison')}
              className="hover:text-[#4A4238] transition-colors cursor-pointer"
            >
              Why Calm
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pricing')}
              className="hover:text-[#4A4238] transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => scrollTo('faq')}
              className="hover:text-[#4A4238] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/Dashboard"
              className="text-xs text-[#4A4238]/75 dark:text-[#EDE6DC]/75 hover:text-[#4A4238] dark:hover:text-white font-medium px-3 py-1.5 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="text-xs bg-[#4A4238] hover:bg-[#383129] dark:bg-[#EDE6DC] dark:hover:bg-white dark:text-[#161311] text-[#F3EDE4] font-medium px-4 py-1.5 rounded-full transition-all duration-200 shadow-xs"
            >
              Get started
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1 text-[#4A4238] cursor-pointer ml-1"
              aria-label="Toggle Menu"
            >
              <span
                className={`w-4 h-[1.5px] bg-[#4A4238] transition-transform ${
                  mobileMenuOpen ? 'rotate-45 translate-y-[3.5px]' : ''
                }`}
              />
              <span
                className={`w-4 h-[1.5px] bg-[#4A4238] transition-transform ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-[#F3EDE4]/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 text-sm font-mono tracking-widest uppercase md:hidden">
          <button
            type="button"
            onClick={() => scrollTo('capabilities')}
            className="text-base text-[#4A4238] hover:text-[#D4826A] transition-colors"
          >
            Capabilities
          </button>
          <button
            type="button"
            onClick={() => scrollTo('how-it-works')}
            className="text-base text-[#4A4238] hover:text-[#D4826A] transition-colors"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollTo('comparison')}
            className="text-base text-[#4A4238] hover:text-[#D4826A] transition-colors"
          >
            Why Calm
          </button>
          <button
            type="button"
            onClick={() => scrollTo('pricing')}
            className="text-base text-[#4A4238] hover:text-[#D4826A] transition-colors"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => scrollTo('faq')}
            className="text-base text-[#4A4238] hover:text-[#D4826A] transition-colors"
          >
            FAQ
          </button>
          <div className="pt-4 flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-full border border-[#4A4238]/20 text-xs font-mono uppercase text-[#4A4238]"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 rounded-full bg-[#D4826A] text-xs font-mono uppercase text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
