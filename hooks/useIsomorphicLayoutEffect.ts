import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` warns during SSR. GSAP setup must run before paint to avoid
 * a flash of un-animated content, so use the layout variant in the browser and
 * fall back to `useEffect` on the server where it never actually runs.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
