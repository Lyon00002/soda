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
 * Section two. A narrow reading rail on the left; the right of the frame is
 * left open because that is where the can travels to on this section's
 * keyframe. The composition is built around the product's path, not beside it.
 */
export function StorySection() {
  const { displayProduct } = useProduct();
  const { story } = displayProduct;
  const ruleRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const rule = ruleRef.current;
    if (!rule || reducedMotion) return;
    registerGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rule,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: EASE.editorial,
          scrollTrigger: { trigger: rule, start: 'top 88%', once: true },
        },
      );
    }, rule);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section id="story" className={`${styles.section} ${styles.story}`} aria-label="Story">
      <div className={`${styles.inner} ${styles.storyInner}`}>
        <div className={styles.storyRail}>
          <div className={styles.rule} ref={ruleRef} />

          <DisplayHeading lines={story.title} className={styles.title} />

          <Reveal className={styles.body} delay={0.15}>
            {story.body.map((paragraph, i) => (
              <p key={i} data-swap-block="">
                {paragraph}
              </p>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
