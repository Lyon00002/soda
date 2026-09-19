/**
 * Seeded pseudo-random numbers.
 *
 * The atmosphere layers (fruit placement, float phases, bubble spawns) all want
 * "random-looking" values, but `Math.random()` in a render would produce a
 * different tree on the server than on the client and blow up hydration.
 * Seeding makes every layout decision deterministic and reproducible.
 */

/** mulberry32. Fast, well-distributed, tiny state. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, so ids can seed a generator. */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rangeFrom(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
