'use client';

import { useRef, type CSSProperties, type ElementType } from 'react';

import type { DisplayLines } from '@/data/products';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { DURATION, EASE } from '@/lib/motion/easings';
import { gsap, registerGsap } from '@/lib/motion/gsap';

interface DisplayHeadingProps {
  lines: DisplayLines;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /**
   * Hero type is choreographed by the entrance master timeline, so it opts out
   * of self-revealing. Everything below the fold reveals on scroll.
   */
  reveal?: boolean;
  /** Stagger offset applied when this heading reveals, seconds. */
  delay?: number;
  /** Marks this heading as a slot in the page entrance timeline. */
  'data-enter'?: string;
}

/**
 * The brand's two-line display construction, preserved from the prototype:
 * a lighter lead line above a solid emphasis line, set in the cursive face at
 * line-height 0.8.
 *
 * Each line sits in its own overflow mask so it can slide up from behind its
 * own baseline. That is what separates a typeset reveal from a div that fades.
 */
export function DisplayHeading({
  lines,
  as: Tag = 'h2',
  className,
  style,
  reveal = true,
  delay = 0,
  'data-enter': dataEnter,
}: DisplayHeadingProps) {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !reveal) return;
    registerGsap();

    if (reducedMotion) {
      gsap.set(el.querySelectorAll('.line-inner'), { yPercent: 0, opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.line-inner'),
        { yPercent: 108, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: DURATION.line,
          ease: EASE.editorial,
          stagger: 0.09,
          delay,
          scrollTrigger: {
            trigger: el,
            start: 'top 84%',
            once: true,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [reveal, reducedMotion, delay]);

  return (
    <Tag
      ref={ref}
      className={className ? `display ${className}` : 'display'}
      style={style}
      data-enter={dataEnter}
    >
      <span className="line-mask">
        <span
          className="line-inner display-lead"
          data-swap-line=""
          style={reveal && !reducedMotion ? { opacity: 0 } : undefined}
        >
          {lines[0]}
        </span>
      </span>
      <span className="line-mask">
        <span
          className="line-inner"
          data-swap-line=""
          style={reveal && !reducedMotion ? { opacity: 0 } : undefined}
        >
          {lines[1]}
        </span>
      </span>
    </Tag>
  );
}

/* ------------------------------------------------------------------ */

interface RevealProps {
  children: React.ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  /** Vertical travel in px. Kept small: display type moves, supporting copy settles. */
  y?: number;
  /** Children matching this selector stagger individually instead of as a block. */
  stagger?: string;
}

/**
 * Supporting content entrance. Deliberately quieter than the display reveal:
 * a short rise with a blur resolve, so the eye lands on the headline first.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className,
  style,
  delay = 0,
  y = 26,
  stagger,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerGsap();

    const targets: Element[] = stagger
      ? Array.from(el.querySelectorAll(stagger))
      : [el];
    if (targets.length === 0) return;

    if (reducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0, filter: 'none' });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y, filter: 'blur(7px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: DURATION.block,
          ease: EASE.editorial,
          stagger: stagger ? 0.075 : 0,
          delay,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [delay, y, stagger, reducedMotion]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
