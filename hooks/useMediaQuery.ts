'use client';

import { useEffect, useState } from 'react';

/**
 * Always returns `false` on the first client render so the markup matches what
 * the server produced, then corrects itself in an effect. Reading matchMedia
 * during render would hydrate-mismatch on any viewport that does not match the
 * server's assumption.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export const MOBILE_QUERY = '(max-width: 900px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
