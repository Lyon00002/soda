'use client';

import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { stageRegistry, type LeafEntry } from '@/lib/stage/stageState';

import styles from './ProductStage.module.css';

interface LeafSpec {
  top: string;
  left: string;
  size: number;
  opacity: number;
  orbit: string;
}

/** Carried over from the prototype's .l1 through .l4. */
const LEAVES: readonly LeafSpec[] = [
  { top: '10%', left: '15%', size: 60, opacity: 1, orbit: '45deg 75deg 105%' },
  { top: '40%', left: '80%', size: 140, opacity: 0.4, orbit: '-30deg 60deg 105%' },
  { top: '70%', left: '75%', size: 80, opacity: 1, orbit: '120deg 85deg 105%' },
  { top: '85%', left: '20%', size: 120, opacity: 0.3, orbit: '10deg 45deg 105%' },
];

interface FloatingLeavesProps {
  /** Trimmed on narrow viewports to keep the atmosphere from crowding the can. */
  count?: number;
  onContainer: (el: HTMLDivElement | null) => void;
}

/**
 * The slowest layer in the composition. Leaves drift on long periods and never
 * react to the cursor, which is what makes the fruit's responsiveness legible
 * by contrast.
 *
 * Unlike the fruit, leaves keep an inline opacity: nothing in the flavour
 * transition animates them, so there is no writer to collide with.
 */
export function FloatingLeaves({ count = LEAVES.length, onContainer }: FloatingLeavesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const specs = LEAVES.slice(0, count);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const entries: LeafEntry[] = Array.from(
      container.querySelectorAll<HTMLElement>('[data-leaf]'),
    ).map((el, i) => ({
      el,
      floatPeriod: 10 + i * 2,
      floatPhase: i * 1.2,
      baseOpacity: Number(el.style.opacity) || 1,
    }));

    stageRegistry.leaves.push(...entries);

    return () => {
      stageRegistry.leaves = stageRegistry.leaves.filter(
        (entry) => !entries.includes(entry),
      );
    };
  }, [count]);

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
          key={i}
          data-leaf=""
          className={styles.leaf}
          src="/assets/models/leaves.glb"
          environment-image="neutral"
          exposure="1.0"
          interaction-prompt="none"
          camera-orbit={spec.orbit}
          loading="eager"
          style={{
            top: spec.top,
            left: spec.left,
            width: `${spec.size}px`,
            height: `${spec.size}px`,
            opacity: spec.opacity,
          }}
        />
      ))}
    </div>
  );
}
