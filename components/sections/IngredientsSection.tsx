'use client';

import { useRef } from 'react';

import { DisplayHeading, Reveal } from '@/components/motion/DisplayHeading';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, registerGsap } from '@/lib/motion/gsap';
import { useProduct } from '@/providers/ProductProvider';

import styles from './Sections.module.css';

/**
 * Section three. One oversized word carries the flavour, set behind the can so
 * the product physically occludes it as it crosses the frame. The word drifts
 * against the scroll, which is what sells the depth: if it moved with the page
 * it would just be a large heading.
 */
export function IngredientsSection() {
  const { displayProduct } = useProduct();
  const { ingredients } = displayProduct;
  const wordRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const word = wordRef.current;
    if (!word || reducedMotion) return;
    registerGsap();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        word,
        { xPercent: -56, yPercent: -50 },
        {
          xPercent: -44,
          yPercent: -50,
          ease: 'none',
          scrollTrigger: {
            trigger: word.closest('section'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        },
      );
    }, word);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="ingredients"
      className={`${styles.section} ${styles.ingredients}`}
      aria-label="Ingredients"
    >
      <span className={styles.megaWord} ref={wordRef} aria-hidden="true" data-swap-block="">
        {ingredients.word}
      </span>

      <div className={`${styles.inner} ${styles.ingredientsInner}`}>
        <DisplayHeading lines={ingredients.title} className={styles.title} />

        <Reveal as="ul" className={styles.notes} stagger="li" delay={0.1}>
          {ingredients.notes.map((note) => (
            <li key={note.name} className={styles.note} data-swap-block="">
              <span className={styles.noteName}>{note.name}</span>
              <span className={styles.noteText}>{note.note}</span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
