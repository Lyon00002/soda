/**
 * Motion personalities.
 *
 * Every moving thing on this page belongs to exactly one of these families.
 * Applying the same ease everywhere is what makes motion read as generic, so
 * each family gets its own curve and its own duration band.
 */

export const EASE = {
  /** Editorial type: slow, confident, no bounce. Long tail out. */
  editorial: 'expo.out',
  /** Display type leaving the frame. Accelerates away, never lingers. */
  editorialOut: 'power3.in',
  /** The can: weighted and physical, with a hint of settle. */
  physical: 'power2.out',
  /** The can arriving from off-frame. Heavy start, soft landing. */
  physicalIn: 'power3.inOut',
  /** Fruit: playful, slightly overshooting. */
  organic: 'back.out(1.5)',
  /** Fruit collapsing inward before a flavour swap. */
  organicIn: 'power2.in',
  /** UI affordances: fast and precise, no personality of their own. */
  ui: 'power2.out',
  /** Background palette morph. Nearly linear so the colour never appears to stall. */
  atmosphere: 'power1.inOut',
  /** The flavour transition's settle. Overshoot that reads as momentum, not wobble. */
  settle: 'back.out(0.7)',
} as const;

export const DURATION = {
  /** Micro feedback on hover / press. */
  ui: 0.32,
  /** A single line of display type revealing. */
  line: 1.05,
  /** Body copy and supporting blocks. */
  block: 0.8,
  /** The can moving between compositions under its own power. */
  stage: 1.4,
  /** Full background palette morph. */
  atmosphere: 1.6,
} as const;

/**
 * Smoothing factor for per-frame lerps, normalised against a 60fps baseline so
 * that a 120Hz display does not converge twice as fast.
 *
 * @param base  Fraction of the remaining distance to close per 60fps frame.
 * @param dtMs  Milliseconds since the previous frame.
 */
export function frameLerpFactor(base: number, dtMs: number): number {
  const frames = Math.min(dtMs, 100) / (1000 / 60);
  return 1 - Math.pow(1 - base, frames);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Smoothstep, used to ease the contiguous scroll boundaries so sections do not hand off linearly. */
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
