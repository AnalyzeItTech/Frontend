'use client';

import React from 'react';
import { IconShieldLock } from '@tabler/icons-react';
import { useTheme } from './ThemeProvider';

interface IncognitoToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const IncognitoToggle: React.FC<IncognitoToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { isIncognito, toggleIncognito } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleIncognito}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer ${
        isIncognito
          ? 'bg-violet-900/70 border-violet-400/50 text-violet-100 shadow-md ring-2 ring-violet-500/25'
          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]/40 hover:text-[var(--text-primary)]'
      } ${className}`}
      aria-pressed={isIncognito}
      aria-label={isIncognito ? 'Turn off incognito mode' : 'Turn on incognito mode'}
      title={
        isIncognito
          ? 'Incognito on — queries are not saved to your history'
          : 'Incognito — ephemeral session, nothing persisted'
      }
    >
      <IconShieldLock size={14} className={isIncognito ? 'text-violet-300' : 'opacity-70'} />
      {showLabel && <span className="hidden sm:inline">Incognito</span>}
    </button>
  );
};
