import gsap from 'gsap';

import type { Product } from '@/data/products';
import { EASE } from '@/lib/motion/easings';
import { stageRegistry, stageState } from '@/lib/stage/stageState';

/**
 * One controller orchestrates every flavour change, no matter where it was
 * triggered from (card, arrow, search suggestion or keyboard). Duplicating this
 * logic per entry point is how a product switch ends up half-applied, with a
 * blue background and a green can.
 *
 * The stage registers an adapter because it owns the DOM the timeline needs to
 * touch. If no adapter is registered yet (first paint, or reduced motion), the
 * controller still resolves and the content swap still happens.
 */

/**
 * Only the parts a React render cannot express live here.
 *
 * Identity (fruit mesh, card art, every string on the page) is derived from
 * `displayProduct`, so it swaps declaratively the moment the midpoint callback
 * updates state. The adapter covers the imperative half: the GSAP timelines
 * that own the DOM around that swap.
 */
export interface StageAdapter {
  /**
   * First-load reveal for the 3D layers, composed into the page's entrance
   * timeline. Lives here because the stage owns the DOM it touches, but is
   * sequenced by the entrance so the whole page enters as one gesture.
   */
  revealStage(): gsap.core.Timeline;
  /** Fruit collapse toward the centre of the frame. */
  implodeFruit(): gsap.core.Timeline;
  /** Fruit burst back out to freshly generated positions. */
  explodeFruit(): gsap.core.Timeline;
  /** Display copy masking out, then back in around the swap. */
  copyOut(): gsap.core.Timeline;
  copyIn(): gsap.core.Timeline;
}

/**
 * Morphs the four palette tokens the whole page reads from. Tweening the custom
 * properties on :root means the background, every glow and every accent-tinted
 * surface all move together without any of them subscribing to product state.
 *
 * @param duration Seconds. Pass 0 to set instantly (initial paint).
 */
export function applyWorld(product: Product, duration: number): void {
  const root = document.documentElement;
  const vars = {
    '--bg-inner': product.world.inner,
    '--bg-mid': product.world.mid,
    '--bg-outer': product.world.outer,
    '--bg-aura': product.world.aura,
  };

  if (duration <= 0) {
    gsap.set(root, vars);
    return;
  }
  gsap.to(root, { ...vars, duration, ease: EASE.atmosphere, overwrite: 'auto' });
}

let adapter: StageAdapter | null = null;
let active: gsap.core.Timeline | null = null;
/**
 * The product the in-flight timeline will actually reveal. Held in a mutable
 * slot rather than captured in the midpoint closure so a request that arrives
 * before the swap can retarget the running timeline instead of queueing behind
 * it. See `runFlavorTransition` for the two interruption cases.
 */
let activeTarget: Product | null = null;
/** Latest requested product while a transition is already past its swap point. */
let queued: { product: Product; onMidpoint: MidpointHandler } | null = null;
let running = false;

/** The moment at which identity changes, in timeline seconds. */
const MIDPOINT = 0.62;

export function registerStageAdapter(next: StageAdapter | null): void {
  adapter = next;
}

export function getStageAdapter(): StageAdapter | null {
  return adapter;
}



/**
 * Receives the product to reveal rather than closing over it, so a retargeted
 * timeline reveals the latest request and not the one it started with.
 */
export type MidpointHandler = (product: Product) => void;

export interface TransitionOptions {
  product: Product;
  /** Fires at the peak of the spin: the moment content is allowed to change. */
  onMidpoint: MidpointHandler;
  onComplete?: () => void;
  reducedMotion: boolean;
}

/**
 * Runs the cinematic flavour change as ONE timeline, so the background morph,
 * the can's spin, the texture swap, the fruit implosion and the copy mask all
 * read as a single gesture rather than as unrelated tweens firing at once.
 */
export function runFlavorTransition(options: TransitionOptions): void {
  const { product, onMidpoint, onComplete, reducedMotion } = options;

  // Interruption policy, split on whether identity has already changed.
  //
  // Before the swap nothing has committed yet, so a new request simply
  // retargets the running timeline and nudges it along. Clicking through the
  // range stays responsive instead of queueing up a backlog of full-length
  // transitions.
  //
  // After the swap the can is already wearing the new colourway, so tearing the
  // timeline apart would strand the fruit and the copy mid-gesture. The latest
  // request waits, and only the latest one runs.
  if (running && active) {
    if (active.time() < MIDPOINT) {
      activeTarget = product;
      applyWorld(product, 1.2);
      active.timeScale(1.55);
      return;
    }
    queued = { product, onMidpoint };
    return;
  }

  if (reducedMotion || !adapter) {
    applyWorld(product, reducedMotion ? 0.3 : 0);
    onMidpoint(product);
    onComplete?.();
    return;
  }

  const stage = adapter;
  running = true;
  activeTarget = product;
  stageState.transitioning = true;

  // 0. The world starts moving first and outlasts the spin, so the colour is
  //    already resolving by the time the new can is revealed.
  applyWorld(product, 1.6);

  const spin = { value: 0, blur: 0 };

  // Settling must happen on BOTH paths. If it only ran in onComplete, a killed
  // or interrupted timeline would leave `running` true forever and the flavour
  // UI would deadlock silently, with no error to trace.
  let settled = false;
  const settle = (finished: boolean) => {
    if (settled) return;
    settled = true;

    stageState.spin = 0;
    stageState.blur = 0;
    stageState.transitioning = false;
    running = false;
    active = null;
    activeTarget = null;

    // Release any fruit the adapter still owns, so the idle loop resumes.
    // On an interrupt the implode may have left them at opacity 0 and a fraction
    // of their scale, and the ticker only writes `transform`, so without this
    // they would be handed back invisible.
    for (const fruit of stageRegistry.fruits) {
      if (!finished && fruit.owned) {
        gsap.set(fruit.el, { opacity: 1, scale: 1 });
      }
      fruit.owned = false;
    }

    const next = queued;
    queued = null;

    if (finished && next) {
      // Hand straight over to the queued request WITHOUT reporting completion.
      // Firing onComplete here would drop the "transitioning" flag for the gap
      // between the two legs, so anything driven by it (aria-busy) would
      // flicker mid-gesture. The relaunched leg carries the same onComplete and
      // reports once, when the whole chain is genuinely done.
      runFlavorTransition({
        product: next.product,
        onMidpoint: next.onMidpoint,
        onComplete,
        reducedMotion,
      });
      return;
    }

    onComplete?.();
  };

  const tl = gsap.timeline({
    onComplete: () => settle(true),
    onInterrupt: () => settle(false),
  });
  active = tl;

  // 1. The can winds up. Blur builds with the spin, so the acceleration reads
  //    as speed rather than as a filter being switched on.
  tl.to(
    spin,
    {
      value: 360,
      blur: 18,
      // Ends exactly at MIDPOINT: the wind-up and the swap are the same beat.
      duration: MIDPOINT,
      ease: 'power2.in',
      onUpdate: () => {
        stageState.spin = spin.value;
        stageState.blur = spin.blur;
      },
    },
    0,
  );

  // 2. Copy clears the frame just ahead of the swap.
  tl.add(stage.copyOut(), 0.06);

  // 3. Fruit collapses inward toward the can.
  tl.add(stage.implodeFruit(), 0.1);

  // 4. Peak. Identity changes here, hidden by the blur and by the fruit sitting
  //    at zero scale. One state update cascades to the can texture, the fruit
  //    meshes, the card art and every string on the page.
  //
  //    Reads the mutable target rather than the captured argument, so a
  //    retarget that arrived during the wind-up reveals the right product.
  tl.call(
    () => onMidpoint(activeTarget ?? product),
    undefined,
    MIDPOINT,
  );

  // 5. The can unwinds and resolves. `back.out` gives it weight on the settle.
  tl.to(
    spin,
    {
      value: 720,
      blur: 0,
      duration: 1.5,
      ease: EASE.settle,
      onUpdate: () => {
        stageState.spin = spin.value;
        stageState.blur = spin.blur;
      },
    },
    MIDPOINT,
  );

  // 6. Copy returns while the can is still resolving, so the two overlap.
  tl.add(stage.copyIn(), 0.78);

  // 7. Fruit bursts back out into newly generated positions.
  tl.add(stage.explodeFruit(), 0.86);
}

/** Cancels any in-flight transition and clears queued work. Used on unmount. */
export function killTransition(): void {
  active?.kill();
  active = null;
  activeTarget = null;
  queued = null;
  running = false;
  stageState.spin = 0;
  stageState.blur = 0;
  stageState.transitioning = false;
}
