'use client';

import React from 'react';
import { Navbar } from './Navbar';

export function LandingExperience({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="main-content"
      className="relative min-h-screen bg-[#F3EDE4] dark:bg-[#171514] text-ink selection:bg-coral/30 selection:text-ink overflow-x-hidden"
      style={{ ['--nav-h' as string]: '96px' }}
    >
      <Navbar />
      {children}
    </div>
  );
}
