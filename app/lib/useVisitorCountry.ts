'use client';

import { useEffect, useState } from 'react';
import { cookieCountry, resolveCountry } from './countryProfile.mjs';

/** Visitor country for marketing copy. Null on the server and first paint, then the edge cookie or browser locale. */
export function useVisitorCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    let cookie: string | null = null;
    try {
      cookie = cookieCountry(document.cookie);
    } catch {
      /* cookies blocked: fall back to the locale */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state once after mount
    setCountry(resolveCountry({ cookie, language: navigator.language }));
  }, []);
  return country;
}
