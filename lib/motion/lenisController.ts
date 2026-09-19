import type Lenis from 'lenis';

/**
 * Lenis is created inside a React effect but needs to be reachable from
 * navigation and search, which live in unrelated parts of the tree. A module
 * handle avoids threading the instance through context purely so a nav link can
 * call `scrollTo`.
 */

let instance: Lenis | null = null;

export function setLenis(next: Lenis | null): void {
  instance = next;
}

/**
 * Scrolls to a section. Falls back to the platform's own smooth scroll when
 * Lenis is not running, which is the case under reduced motion.
 */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  if (instance) {
    instance.scrollTo(target, { offset: 0, duration: 1.25 });
    return;
  }

  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  target.scrollIntoView({
    behavior: prefersReduced ? 'auto' : 'smooth',
    block: 'start',
  });
}

