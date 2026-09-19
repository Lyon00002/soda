'use client';

import { useCallback, useRef } from 'react';

import { isNeutralRecolor } from '@/data/products';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useMediaQuery, useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE } from '@/lib/motion/easings';
import { gsap } from '@/lib/motion/gsap';
import { filterString } from '@/lib/products/recolor';
import { useProduct } from '@/providers/ProductProvider';

import styles from './ProductSelector.module.css';

/** Cards shown at once. The prototype's pair, preserved. */
const VISIBLE = 2;

const CARD_WIDTH = 135;
const CARD_WIDTH_SMALL = 118;
const GAP = 16;

/**
 * The range, presented as a window rather than a grid.
 *
 * Six products would make a catalogue if they were all laid out at once, so the
 * rail keeps the prototype's pair and pages between them. Selection is a radio
 * group: one value, arrow-key navigable, roving tabindex, which is both the
 * accessible pattern and an accurate description of what it does.
 */
export function ProductSelector() {
  const { products, activeProduct, activeIndex, selectProduct, stepProduct } =
    useProduct();
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isSmall = useMediaQuery('(max-width: 520px)');

  const step = (isSmall ? CARD_WIDTH_SMALL : CARD_WIDTH) + GAP;

  // The prototype showed exactly two cans side by side, and that pairing is
  // part of the composition. With six products the rail keeps the pair and
  // pages between them, rather than widening into a row that reads as a grid.
  //
  // The offset snaps to a page boundary so a pair is always whole: you never
  // see one card and half of its neighbour.
  const maxOffset = Math.max(0, products.length - VISIBLE);
  const page = Math.floor(activeIndex / VISIBLE) * VISIBLE;
  const offset = Math.min(maxOffset, page);

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const x = -offset * step;
    if (reducedMotion) {
      gsap.set(track, { x });
      return;
    }
    gsap.to(track, { x, duration: 0.62, ease: EASE.physical, overwrite: true });
  }, [offset, step, reducedMotion]);

  // Arrow keys move the selection, which is what a radio group is expected to
  // do, and each move runs the full flavour transition like any other entry point.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const delta =
        event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? -1
            : 0;
      if (delta === 0) return;
      event.preventDefault();
      stepProduct(delta);
      // Roving tabindex moves aria-checked and tabIndex=0 to the new card, but
      // setting tabindex="-1" on an already-focused element does not blur it.
      // Without this, focus is stranded on a card that now reports unchecked,
      // and it may have scrolled out of the clipped rail entirely.
      pendingFocusRef.current = true;
    },
    [stepProduct],
  );

  // Applied after the render that moves the selection, so the target card
  // exists with its new tabIndex before focus is placed on it.
  const pendingFocusRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (!pendingFocusRef.current) return;
    pendingFocusRef.current = false;
    trackRef.current
      ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
      ?.focus();
  }, [activeProduct.id]);

  return (
    <div className={styles.selector}>
      <div className={styles.rail}>
        <div
          className={styles.track}
          ref={trackRef}
          role="radiogroup"
          aria-label="Choose a flavour"
          data-enter="hero-cards"
          onKeyDown={onKeyDown}
        >
          {products.map((product) => {
            const isActive = product.id === activeProduct.id;
            const recolor = filterString(product.recolor);
            const filter = isNeutralRecolor(product.recolor)
              ? undefined
              : `drop-shadow(0 20px 35px rgba(0, 0, 0, 0.5)) ${recolor}`;

            return (
              <div
                key={product.id}
                className={styles.card}
                data-enter-card=""
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectProduct(product.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectProduct(product.id);
                  }
                }}
              >
                <img
                  className={styles.can}
                  src={product.cardImage}
                  alt=""
                  width={140}
                  height={140}
                  loading="eager"
                  decoding="async"
                  style={filter ? { filter } : undefined}
                />
                <span className={styles.info}>
                  <span className={styles.name}>{product.name}</span>
                  <span className={styles.price}>{product.price}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => stepProduct(-1)}
          aria-label="Previous flavour"
        >
          <span aria-hidden="true">&#8592;</span>
        </button>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => stepProduct(1)}
          aria-label="Next flavour"
        >
          <span aria-hidden="true">&#8594;</span>
        </button>
      </div>
    </div>
  );
}
