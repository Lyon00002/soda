import gsap from 'gsap';
import { CSSPlugin } from 'gsap/CSSPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Single registration point. Registering a plugin more than once is harmless,
 * but importing it from one module keeps every consumer on the same instance
 * and makes it obvious where plugin surface is added.
 */
let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === 'undefined') return;
  // CSSPlugin is registered by gsap's package entry point, but registering it
  // explicitly makes the dependency survive any bundler that decides to
  // tree-shake or deep-import its way around that side effect.
  gsap.registerPlugin(ScrollTrigger, CSSPlugin);
  // Long frames (tab restore, a heavy GLB decode) would otherwise make GSAP
  // fabricate a huge delta and jump every scrubbed animation.
  gsap.ticker.lagSmoothing(0);
  registered = true;
}

export { gsap, ScrollTrigger };
