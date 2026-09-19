'use client';

import { useRef } from 'react';

import type { Product } from '@/data/products';
import { isNeutralRecolor } from '@/data/products';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { filterString } from '@/lib/products/recolor';
import {
  measureFruit,
  stageRegistry,
  stageState,
  type FruitEntry,
} from '@/lib/stage/stageState';
import { createRng, hashSeed, rangeFrom } from '@/lib/utils/prng';

import styles from './ProductStage.module.css';

export interface FruitSpec {
  top: string;
  left: string;
  size: number;
  /** Preserved from the prototype so each mesh presents a different face. */
  orbit: string;
}

/**
 * Positions, sizes and camera orbits are carried over verbatim from the
 * prototype. They are the composition, not arbitrary numbers.
 */
export const FOREGROUND_FRUIT: readonly FruitSpec[] = [
  { top: '25%', left: '30%', size: 220, orbit: '45deg 120deg 105%' },
  { top: '60%', left: '42%', size: 100, orbit: '-120deg 45deg 105%' },
  { top: '30%', left: '62%', size: 250, orbit: '200deg 90deg 105%' },
  { top: '15%', left: '48%', size: 140, orbit: '10deg 20deg 105%' },
  { top: '75%', left: '20%', size: 120, orbit: '-45deg 160deg 105%' },
  { top: '45%', left: '75%', size: 180, orbit: '80deg 75deg 105%' },
];

export const BACKGROUND_FRUIT: readonly FruitSpec[] = [
  { top: '15%', left: '40%', size: 80, orbit: '-20deg 110deg 105%' },
  { top: '50%', left: '55%', size: 70, orbit: '160deg 45deg 105%' },
  { top: '80%', left: '35%', size: 75, orbit: '45deg 20deg 105%' },
];

/** Float periods, preserved from the prototype's per-index duration table. */
const FLOAT_PERIODS = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10];

interface FruitLayerProps {
  product: Product;
  specs: readonly FruitSpec[];
  /** +1 foreground (travels with the cursor), -1 background (travels against). */
  depth: 1 | -1;
  /** Index offset so foreground and background draw from different float periods. */
  seedOffset: number;
  onContainer: (el: HTMLDivElement | null) => void;
}

export function FruitLayer({
  product,
  specs,
  depth,
  seedOffset,
  onContainer,
}: FruitLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const src = `/assets/models/${product.fruit}.glb`;

  // Depth is expressed through light, not alpha: background fruit are lit and
  // exposed lower so they sit back in the scene. Crucially this leaves `opacity`
  // entirely to GSAP, which owns it during the implode/explode. If React also
  // wrote an inline opacity here, the re-render at the transition midpoint would
  // pop the fruit back into view at exactly the moment they must stay hidden.
  const isBackground = depth === -1;

  // `none` is not a valid entry inside a filter list, so a neutral recipe
  // contributes nothing rather than the string "none".
  const filter = [
    'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))',
    isBackground ? 'brightness(0.72)' : null,
    isNeutralRecolor(product.fruitRecolor)
      ? null
      : filterString(product.fruitRecolor),
  ]
    .filter(Boolean)
    .join(' ');

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const els = Array.from(
      container.querySelectorAll<HTMLElement>('[data-fruit]'),
    );
    const rng = createRng(hashSeed(`fruit-${depth}-${els.length}`));

    const entries: FruitEntry[] = els.map((el, i) => {
      const entry: FruitEntry = {
        el,
        layoutX: 0,
        layoutY: 0,
        rx: 0,
        ry: 0,
        angle: rangeFrom(rng, 0, 360),
        baseX: 0,
        baseY: 0,
        floatPeriod: FLOAT_PERIODS[(i + seedOffset) % FLOAT_PERIODS.length] ?? 6,
        floatPhase: rangeFrom(rng, 0, 12),
        floatAmp: rangeFrom(rng, 10, 18),
        depth,
        // A viewport crossing the mobile breakpoint re-registers this layer.
        // If that lands mid-transition, GSAP still owns these exact DOM nodes,
        // so a fresh entry must not hand them straight back to the ticker.
        owned: stageState.transitioning,
      };
      measureFruit(entry);
      return entry;
    });

    stageRegistry.fruits.push(...entries);

    return () => {
      stageRegistry.fruits = stageRegistry.fruits.filter(
        (entry) => !entries.includes(entry),
      );
    };
    // Re-registering on `specs.length` covers the responsive fruit-count change.
  }, [depth, seedOffset, specs.length]);

  return (
    <div
      className={styles.layer}
      ref={(el) => {
        containerRef.current = el;
        onContainer(el);
      }}
    >
      {specs.map((spec, i) => (
        <model-viewer
          key={`${spec.top}-${spec.left}-${i}`}
          data-fruit=""
          className={styles.fruit}
          src={src}
          environment-image="neutral"
          exposure={isBackground ? '0.72' : '1.2'}
          interaction-prompt="none"
          camera-orbit={spec.orbit}
          loading="eager"
          style={{
            top: spec.top,
            left: spec.left,
            width: `${spec.size}px`,
            height: `${spec.size}px`,
            filter,
          }}
        />
      ))}
    </div>
  );
}
