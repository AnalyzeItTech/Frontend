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
      className={`relative inline-flex items-center justify-center p-2 rounded-full border transition-all duration-300 cursor-pointer ${
        isDark
          ? 'bg-[#24201D] border-white/15 text-[#E8C4A0] hover:text-white hover:border-white/30 shadow-xs'
          : 'bg-white/70 border-[#4A4238]/12 text-[#4A4238] hover:text-[#D4826A] hover:border-[#D4826A]/30 shadow-xs'
      } ${className}`}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <IconSun size={16} stroke={2} className="transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <IconMoon size={16} stroke={2} className="transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-mono uppercase tracking-wider">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
