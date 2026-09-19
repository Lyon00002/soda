'use client';

import { useRef } from 'react';

import { DisplayHeading, Reveal } from '@/components/motion/DisplayHeading';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE } from '@/lib/motion/easings';
import { gsap, registerGsap } from '@/lib/motion/gsap';
import { useProduct } from '@/providers/ProductProvider';

import styles from './Sections.module.css';

/**
 * Section four. A diagonal composition: the headline holds the top left, the
 * reading and the measurements sit bottom right, and the can makes its closest
 * approach through the middle of the frame.
 *
 * The metric bars are drawn lines rather than filled tracks. An empty channel
 * behind each bar would add dashboard furniture to an editorial page and say
 * nothing the line does not already say.
 */
export function TasteSection() {
  const { displayProduct } = useProduct();
  const { taste } = displayProduct;
  const metricsRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const list = metricsRef.current;
    if (!list) return;
    registerGsap();

    const bars = Array.from(
      list.querySelectorAll<HTMLElement>('[data-metric-bar]'),
    );
    if (bars.length === 0) return;

    const scaleFor = (bar: HTMLElement) => Number(bar.dataset.value ?? 0) / 100;

    if (reducedMotion) {
      for (const bar of bars) gsap.set(bar, { scaleX: scaleFor(bar) });
      return;
    }

    const ctx = gsap.context(() => {
      for (const bar of bars) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: scaleFor(bar),
            duration: 1.1,
            ease: EASE.editorial,
            scrollTrigger: { trigger: list, start: 'top 84%', once: true },
          },
        );
      }
    }, list);

    return () => ctx.revert();
    // Re-runs on product change so the bars redraw to the new measurements.
  }, [reducedMotion, displayProduct.id]);

  return (
    <section id="taste" className={`${styles.section} ${styles.taste}`} aria-label="Taste">
      <div className={`${styles.inner} ${styles.tasteInner}`}>
        <div className={styles.tasteTop}>
          <DisplayHeading lines={taste.title} className={styles.title} />
        </div>

        <div className={styles.tasteBottom}>
          <Reveal className={styles.lead}>
            <p data-swap-block="">{taste.body}</p>
          </Reveal>

          <ul className={styles.metrics} ref={metricsRef}>
            {taste.metrics.map((metric) => (
              <li key={metric.label} className={styles.metric} data-swap-block="">
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>{metric.value}</span>
                <span
                  className={styles.metricBar}
                  data-metric-bar=""
                  data-value={metric.value}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
