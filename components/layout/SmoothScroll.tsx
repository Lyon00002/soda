'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, ScrollTrigger, registerGsap } from '@/lib/motion/gsap';
import { setLenis } from '@/lib/motion/lenisController';

/**
 * Lenis drives the scroll position; GSAP's ticker drives Lenis; ScrollTrigger
 * reads whatever Lenis last wrote. Order matters:
 *
 *   1. Lenis emits `scroll`  ->  ScrollTrigger.update()
 *   2. GSAP ticker advances  ->  lenis.raf()
 *
 * Wiring it the other way round makes every scrubbed animation trail the scroll
 * by exactly one frame, which reads as lag on the pinned 3D stage.
 */
export function SmoothScroll() {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    registerGsap();

    // Smooth scrolling is itself motion. Under reduced-motion the page keeps
    // native scrolling and ScrollTrigger simply reads the real scroll position.
    if (reducedMotion) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      // Long, shallow exponential glide. Fast enough to feel responsive on a
      // trackpad, slow enough that the scrubbed stage keeps its weight.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6,
      /* Native touch scrolling stays; only wheel input is smoothed. */
      syncTouch: false,
    });

    setLenis(lenis);

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onLenisScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    // Fonts change line-wrapping, which changes section heights, which moves
    // every trigger boundary. Recalculate once the display face is in.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      lenis.off('scroll', onLenisScroll);
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  return null;
}
