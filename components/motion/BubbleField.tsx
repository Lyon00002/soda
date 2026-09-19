'use client';

import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useIsMobile, useReducedMotion } from '@/hooks/useMediaQuery';
import { gsap, registerGsap } from '@/lib/motion/gsap';
import { createRng, hashSeed, rangeFrom } from '@/lib/utils/prng';

import styles from './BubbleField.module.css';

const DESKTOP_COUNT = 24;
const MOBILE_COUNT = 10;

interface Bubble {
  el: HTMLImageElement;
  /** 0-1 across the viewport width. */
  x: number;
  /** 0 at the bottom edge, 1 past the top. */
  y: number;
  size: number;
  speed: number;
  drift: number;
  spin: number;
  peakOpacity: number;
  rotation: number;
}

/**
 * Continuous carbonation, running the full height of the page behind every
 * section. This is the one atmosphere layer that never resets at a section
 * boundary, which is part of what makes six sections read as one space.
 *
 * Implemented as a fixed-size recycled pool rather than the prototype's
 * `setInterval` + `createElement` + `setTimeout(remove)`:
 *
 *   - A timer keeps appending nodes while the tab is backgrounded (intervals
 *     are throttled, not stopped), so returning to the tab flushes a backlog.
 *     Driving spawns from the ticker means they pause with rAF.
 *   - Recycling caps the node count by construction instead of by hoping the
 *     removal timeout always fires.
 */
export function BubbleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const count = isMobile ? MOBILE_COUNT : DESKTOP_COUNT;

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    registerGsap();

    const rng = createRng(hashSeed(`bubbles-${count}`));
    const els = Array.from(
      container.querySelectorAll<HTMLImageElement>('[data-bubble]'),
    );

    const reset = (bubble: Bubble, initial: boolean) => {
      bubble.x = rng();
      // On first fill, scatter through the whole column so the field is already
      // populated at load instead of filling in from the bottom over 10s.
      bubble.y = initial ? rng() : -0.06 - rng() * 0.08;
      bubble.size = rangeFrom(rng, 10, 30);
      bubble.speed = rangeFrom(rng, 0.055, 0.14);
      bubble.drift = rangeFrom(rng, -0.035, 0.055);
      bubble.spin = rangeFrom(rng, -50, 50);
      bubble.peakOpacity = rangeFrom(rng, 0.2, 0.6);
      bubble.rotation = rangeFrom(rng, 0, 360);
    };

    const bubbles: Bubble[] = els.map((el) => {
      const bubble: Bubble = {
        el,
        x: 0,
        y: 0,
        size: 16,
        speed: 0.1,
        drift: 0,
        spin: 0,
        peakOpacity: 0.4,
        rotation: 0,
      };
      reset(bubble, true);
      return bubble;
    });

    const draw = (bubble: Bubble, height: number, width: number) => {
      // Matches the prototype's opacity profile: invisible at the edges,
      // holding steady through the middle of the climb.
      const fade =
        bubble.y < 0.1
          ? Math.max(0, bubble.y / 0.1)
          : bubble.y > 0.9
            ? Math.max(0, (1 - bubble.y) / 0.1)
            : 1;

      bubble.el.style.width = `${bubble.size}px`;
      bubble.el.style.opacity = `${bubble.peakOpacity * fade}`;
      bubble.el.style.transform =
        `translate3d(${bubble.x * width}px, ${(1 - bubble.y) * height}px, 0) ` +
        `rotate(${bubble.rotation}deg)`;
    };

    if (reducedMotion) {
      // Keep the field, lose the motion. The composition still reads as
      // carbonated rather than emptying out the background entirely.
      const { innerWidth: w, innerHeight: h } = window;
      for (const bubble of bubbles) draw(bubble, h, w);
      return;
    }

    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 100) / 1000;
      const height = window.innerHeight;
      const width = window.innerWidth;

      for (const bubble of bubbles) {
        bubble.y += bubble.speed * dt;
        bubble.x += bubble.drift * dt;
        bubble.rotation += bubble.spin * dt;

        // Recycle rather than destroy: the node count never grows.
        if (bubble.y > 1.08) reset(bubble, false);

        draw(bubble, height, width);
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [count, reducedMotion]);

  return (
    <div
      className={styles.field}
      ref={containerRef}
      data-enter="bubbles"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          data-bubble=""
          className={styles.bubble}
          src="/assets/images/bubble.png"
          alt=""
          decoding="async"
          loading="eager"
        />
      ))}
    </div>
  );
}
