'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
import { useGlobe } from './useGlobe';
import type { GlobeVariant } from './types';

export function GlobeCanvas({
  variant,
  className = '',
}: {
  variant: Exclude<GlobeVariant, 'parked'>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { registerMount } = useGlobe();

  useLayoutEffect(() => {
    registerMount(variant, ref.current);
    return () => registerMount(variant, null);
  }, [registerMount, variant]);

  return (
    <div
      ref={ref}
      data-globe-mount={variant}
      className={`relative h-full w-full overflow-hidden ${className}`}
      aria-hidden={variant === 'mini'}
    />
  );
}
