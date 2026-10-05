'use client';

import { useEffect } from 'react';
import { warmAgent } from './warmApi';

/** Wake the agent when a page that will use it opens. */
export function useWarmAgent(): void {
  useEffect(() => {
    warmAgent();
  }, []);
}
