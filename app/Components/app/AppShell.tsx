'use client';

import { Suspense } from 'react';
import { motion } from 'motion/react';
import { IconShieldLock } from '@tabler/icons-react';
import { useTheme } from '../ui/ThemeProvider';
import { RequireAuth } from './RequireAuth';
import { FeedbackWidget } from './FeedbackWidget';
import { AppNav, type AppNavId } from './AppNav';

export type { AppNavId };

export function AppShell({
  active,
  children,
  flush,
}: {
  active: AppNavId;
  children: React.ReactNode;
  flush?: boolean;
}) {
  const { isIncognito } = useTheme();

  return (
    <RequireAuth>
      <div className={`app-shell flex flex-col ${isIncognito ? 'app-shell--incognito' : ''}`}>
        <AppNav surface="app" active={active} />

        {isIncognito ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="flex shrink-0 items-center justify-center gap-2 overflow-hidden border-b border-violet-500/25 bg-violet-950/80 px-4 py-1.5 text-[11px] font-mono text-violet-200"
          >
            <IconShieldLock size={13} className="text-violet-300" />
            <span>
              <strong>Incognito:</strong> this session is ephemeral — nothing is saved to your history.
            </span>
          </motion.div>
        ) : null}

        <div
          className={`app-shell-body min-h-0 flex-1 ${
            flush ? 'app-shell-body--flush flex flex-col overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </div>
        <Suspense fallback={null}>
          <FeedbackWidget />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
