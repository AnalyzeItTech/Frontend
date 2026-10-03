import React from 'react';

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
      {icon && <div className="text-neutral-300 dark:text-neutral-600" aria-hidden="true">{icon}</div>}
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      {hint && <p className="text-xs text-[var(--text-muted)] max-w-xs">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
