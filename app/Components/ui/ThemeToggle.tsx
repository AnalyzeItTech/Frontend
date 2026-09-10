'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { IconSun, IconMoon } from '@tabler/icons-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-full border p-2 transition-all duration-300 cursor-pointer ${
        isDark
          ? 'bg-[var(--surface-2)] border-[var(--border-strong)] text-[var(--peach,#EBA58F)] hover:text-[var(--text-primary)] hover:border-[#E3836C]'
          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] hover:text-[#E3836C] hover:border-[#E3836C]/40'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <div className="relative flex h-4 w-4 items-center justify-center">
        {isDark ? <IconSun size={16} stroke={2} /> : <IconMoon size={16} stroke={2} />}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-mono uppercase tracking-wider">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
