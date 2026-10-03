'use client';

import React from 'react';
import { ConfirmProvider } from './ConfirmDialog';
import { ToastProvider } from './Toast';

/** One provider for the shared feedback UI (toasts + confirm dialogs). Mounted once in the root layout. */
export function UIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
