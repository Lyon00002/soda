'use client';

import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, registerGsap } from '@/lib/motion/gsap';
import { useProduct } from '@/providers/ProductProvider';

import styles from './Sections.module.css';

/**
 * Section five. Product characteristics as five full-width type rows rather
 * than a specification grid.
 *
 * Rows alternate solid and outlined, and drift horizontally against the scroll
 * in alternating directions. The motion is what carries the information here:
 * it turns a list into a rhythm, and it is the reason this can be a spec
 * section without a table, a hairline per row, or a three-column card set.
 */
export function DetailsSection() {
  const { displayProduct } = useProduct();
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    registerGsap();

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>('[data-detail-row]'),
    );
    if (rows.length === 0) return;

    if (reducedMotion) {
      gsap.set(rows, { x: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      rows.forEach((row, i) => {
        const direction = i % 2 === 0 ? 1 : -1;

        // Entrance: each row clears its own edge.
        gsap.fromTo(
          row,
          { opacity: 0, x: 70 * direction },
          {
            opacity: 1,
            x: 0,
            duration: 0.9,
            ease: 'expo.out',
            scrollTrigger: { trigger: row, start: 'top 92%', once: true },
          },
        );

        // Continuous drift, scrubbed. Opposing directions per row keep the
        // column moving without any single row travelling far.
        gsap.fromTo(
          row,
          { xPercent: -2.5 * direction },
          {
            xPercent: 2.5 * direction,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          },
        );
      });
    }, container);

    return () => ctx.revert();
  }, [reducedMotion, displayProduct.id]);

  return (
    <section id="detail" className={`${styles.section} ${styles.detail}`} aria-label="Detail">
      <div className={`${styles.inner} ${styles.detailInner}`} ref={containerRef}>
        {displayProduct.details.map((spec) => (
          <span key={spec} className={styles.detailRow} data-detail-row="" data-swap-block="">
            {spec}
          </span>
        ))}
      </div>
    </section>
  );
}
