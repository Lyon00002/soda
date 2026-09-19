/**
 * Scroll choreography for the persistent 3D stage.
 *
 * The can lives in a `position: fixed` layer, so it is always "pinned" without
 * ScrollTrigger pinning anything (no pin-spacers, no layout reflow, no jank).
 * Scrolling only re-composes its transform and camera.
 *
 * One keyframe per section. The transition INTO section i is scrubbed over the
 * viewport of scroll immediately before section i lands, so the ranges are
 * contiguous and never overlap. Exactly one boundary is ever active, which is
 * what keeps the composition deterministic.
 */

export const SECTION_IDS = [
  'hero',
  'story',
  'ingredients',
  'taste',
  'detail',
  'final',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface StageKeyframe {
  /** Stage translation, in viewport units (vw / vh). */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** CSS rotation of the whole stage. The prototype's signature 25deg is the hero value. */
  readonly rotate: number;
  /** Camera orbit azimuth, degrees. Monotonic across the page so the can turns one way. */
  readonly theta: number;
  /** Camera orbit polar angle, degrees. 90 is level with the can. */
  readonly phi: number;
  /** Camera orbit radius, percent of the model's framing distance. */
  readonly radius: number;
  readonly opacity: number;
  /** Ambient glow strength behind the can, 0-1. */
  readonly glow: number;
}

/** Narrow viewports get a flatter, more centred choreography: less lateral travel, less scale swing. */
export type StageKeyframeOverride = Partial<StageKeyframe>;

interface SectionStage {
  readonly desktop: StageKeyframe;
  readonly mobile: StageKeyframeOverride;
}

export const STAGE_KEYFRAMES: Record<SectionId, SectionStage> = {
  // Hero reproduces the prototype's composition exactly: centred, 25deg tilt,
  // camera at "0deg 90deg 380%". Everything downstream departs from here.
  hero: {
    desktop: { x: 0, y: 0, scale: 1, rotate: 25, theta: 0, phi: 90, radius: 380, opacity: 1, glow: 1 },
    mobile: { scale: 0.92, rotate: 18 },
  },
  // Can steps right and stands up as the story column takes the left third.
  // Three-quarter view: still recognisably the front.
  story: {
    desktop: { x: 21, y: 1, scale: 0.94, rotate: 9, theta: 45, phi: 82, radius: 372, opacity: 1, glow: 0.8 },
    mobile: { x: 0, y: 16, scale: 0.66, rotate: 6 },
  },
  // Crosses to the left so the oversized ingredient word can pass behind it,
  // and turns far enough to present the ingredients panel. The one section
  // where the back of the can is the right thing to be looking at.
  ingredients: {
    desktop: { x: -23, y: 2, scale: 0.88, rotate: -13, theta: 160, phi: 97, radius: 376, opacity: 1, glow: 0.65 },
    mobile: { x: 0, y: 17, scale: 0.6, rotate: -8 },
  },
  // Closest approach, and the front comes back around to face the viewer: this
  // is a product moment, so it must not be spent looking at a nutrition table.
  // Scale is held at 1.14 so the can reads as close without both ends being
  // cropped, which looks accidental rather than dramatic.
  taste: {
    desktop: { x: 2, y: -3, scale: 1.14, rotate: 4, theta: 360, phi: 86, radius: 345, opacity: 1, glow: 1 },
    mobile: { x: 0, y: -4, scale: 0.84, rotate: 3 },
  },
  // Pushed back and right; the detail rows own the frame here.
  detail: {
    desktop: { x: 25, y: 5, scale: 0.62, rotate: 18, theta: 480, phi: 76, radius: 404, opacity: 0.9, glow: 0.45 },
    mobile: { x: 0, y: 20, scale: 0.46, rotate: 12, opacity: 0.8 },
  },
  // Returns to the centre, front-facing (720 = two full turns), slightly larger
  // than the hero. The journey closes on the same view it opened with.
  final: {
    desktop: { x: 0, y: -3, scale: 1.06, rotate: 25, theta: 720, phi: 90, radius: 366, opacity: 1, glow: 1 },
    mobile: { x: 0, y: 2, scale: 0.9, rotate: 18 },
  },
};

export function resolveKeyframe(id: SectionId, isMobile: boolean): StageKeyframe {
  const entry = STAGE_KEYFRAMES[id];
  return isMobile ? { ...entry.desktop, ...entry.mobile } : entry.desktop;
}

/** Linear interpolation between two fully-resolved keyframes. */
export function lerpKeyframe(a: StageKeyframe, b: StageKeyframe, t: number): StageKeyframe {
  const mix = (from: number, to: number) => from + (to - from) * t;
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    scale: mix(a.scale, b.scale),
    rotate: mix(a.rotate, b.rotate),
    theta: mix(a.theta, b.theta),
    phi: mix(a.phi, b.phi),
    radius: mix(a.radius, b.radius),
    opacity: mix(a.opacity, b.opacity),
    glow: mix(a.glow, b.glow),
  };
}

/** Navigation labels map 1:1 onto real sections, so every link actually goes somewhere. */
export const NAV_ITEMS: ReadonlyArray<{ id: SectionId; label: string }> = [
  { id: 'hero', label: 'Home' },
  { id: 'story', label: 'Story' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'taste', label: 'Taste' },
  { id: 'detail', label: 'Detail' },
];
