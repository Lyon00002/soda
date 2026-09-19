import type { StageKeyframe } from '@/data/stage';
import { resolveKeyframe } from '@/data/stage';

/**
 * The 3D stage is driven by three independent input systems that must compose
 * additively rather than overwrite one another:
 *
 *   scroll      section keyframes, scrubbed by ScrollTrigger
 *   pointer     smoothed cursor influence
 *   transition  spin + motion blur during a flavour change
 *
 * Each system only ever writes its own slice of this object. A single ticker in
 * <ProductStage> reads the whole thing, folds it into one transform and one
 * camera-orbit string, and writes to the DOM exactly once per frame.
 *
 * This is deliberately a module singleton of plain mutable numbers: it survives
 * StrictMode's double-mount, and it never triggers a React render, which is what
 * keeps a 120Hz pointer stream from re-rendering the tree.
 */

export interface PointerState {
  /** Normalised to -0.5..0.5 across the viewport. Drives camera + parallax. */
  x: number;
  y: number;
  /** Raw viewport pixels. Drives the fruit force field. */
  px: number;
  py: number;
  /** False until the first real pointer event, so nothing snaps on load. */
  engaged: boolean;
}

export interface StageState {
  /**
   * Where the scroll says the can should be. Written by the ScrollTrigger
   * boundaries the instant scroll position changes.
   */
  scrollTarget: StageKeyframe;
  /**
   * Where the can actually is. Lerped toward `scrollTarget` every frame, which
   * is what gives the product its weight and absorbs anchor jumps without a
   * teleport. Doing this here rather than with `scrub` keeps the smoothing on
   * the composed value instead of on six independent tweens.
   */
  scroll: StageKeyframe;
  /** Raw pointer target. */
  pointer: PointerState;
  /** Pointer after per-frame smoothing. This is what actually gets composed. */
  smooth: { x: number; y: number; px: number; py: number };
  /** Extra azimuth from the flavour transition, degrees. */
  spin: number;
  /** Motion blur on the can during a flavour transition, px. */
  blur: number;
  /**
   * How far the hero atmosphere has been driven out of frame, 0 to 1.
   *
   * The fruit and leaves belong to the hero composition, not to the whole
   * document. Scrolling past the hero splits them apart horizontally and fades
   * them out, so the editorial sections below are left to the product and the
   * type instead of carrying cherries across every screen.
   */
  disperse: number;
  /** True while a flavour transition owns the fruit, so the idle loop lets go. */
  transitioning: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
}

function createStageState(isMobile = false): StageState {
  return {
    scrollTarget: resolveKeyframe('hero', isMobile),
    scroll: resolveKeyframe('hero', isMobile),
    pointer: { x: 0, y: 0, px: -9999, py: -9999, engaged: false },
    smooth: { x: 0, y: 0, px: -9999, py: -9999 },
    spin: 0,
    blur: 0,
    disperse: 0,
    transitioning: false,
    reducedMotion: false,
    isMobile,
  };
}

export const stageState: StageState = createStageState();

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

/**
 * Per-fruit simulation state. Layout geometry is cached rather than measured:
 * the fruit only ever moves by `transform`, so its untransformed box is stable
 * and can be read once per resize instead of once per frame. That removes the
 * prototype's nine `getBoundingClientRect()` calls per frame.
 */
export interface FruitEntry {
  el: HTMLElement;
  /** Cached untransformed centre, relative to the stage layer. */
  layoutX: number;
  layoutY: number;
  /** Current repulsion offset, lerped toward the target each frame. */
  rx: number;
  ry: number;
  /** Accumulated spin, degrees. Speeds up near the cursor. */
  angle: number;
  /** Base offset, re-randomised on every flavour transition. */
  baseX: number;
  baseY: number;
  /** Float personality. */
  floatPeriod: number;
  floatPhase: number;
  floatAmp: number;
  /** Parallax depth multiplier: foreground fruit travel further than background. */
  depth: number;
  /** Set by the transition controller so the idle loop skips owned fruit. */
  owned: boolean;
}

export interface LeafEntry {
  el: HTMLElement;
  floatPeriod: number;
  floatPhase: number;
  /** Resting opacity, captured at registration so the entrance can restore it. */
  baseOpacity: number;
}

export interface StageRegistry {
  /** The stage wrapper that receives the composed transform. */
  root: HTMLElement | null;
  /**
   * Inner wrapper used exclusively by the first-load reveal.
   *
   * The reveal animates opacity, scale and blur; the ticker writes `transform`
   * and `opacity` on `root` every frame. Sharing one element would mean the
   * ticker overwrites the entrance fade on the very next frame, so the two
   * concerns get one element each.
   */
  canReveal: HTMLElement | null;
  /** Radial glow layer behind the can. */
  glow: HTMLElement | null;
  /** Parallax containers. */
  fruitFg: HTMLElement | null;
  fruitBg: HTMLElement | null;
  leafLayer: HTMLElement | null;
  fruits: FruitEntry[];
  leaves: LeafEntry[];
}

export const stageRegistry: StageRegistry = {
  root: null,
  canReveal: null,
  glow: null,
  fruitFg: null,
  fruitBg: null,
  leafLayer: null,
  fruits: [],
  leaves: [],
};

/** Re-reads the cached layout geometry. Call on mount and on resize only. */
export function measureFruit(entry: FruitEntry): void {
  const el = entry.el;
  entry.layoutX = el.offsetLeft + el.offsetWidth / 2;
  entry.layoutY = el.offsetTop + el.offsetHeight / 2;
}

export function measureAllFruit(): void {
  for (const entry of stageRegistry.fruits) measureFruit(entry);
}

