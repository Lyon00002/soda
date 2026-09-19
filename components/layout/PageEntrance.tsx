'use client';

import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE } from '@/lib/motion/easings';
import { gsap, ScrollTrigger, registerGsap } from '@/lib/motion/gsap';
import { whenStageReady } from '@/lib/stage/readiness';
import { stageRegistry } from '@/lib/stage/stageState';
import { getStageAdapter } from '@/lib/stage/transitionController';

/**
 * The first three seconds.
 *
 * This is one authored sequence, not every element fading in at once. It builds
 * deliberately toward the product: chrome settles, the headline is typeset, the
 * supporting copy and the range arrive, and only then does the can resolve out
 * of the background as the payoff. The atmosphere fills in behind it and the
 * secondary headline closes the composition.
 *
 * Elements are hidden synchronously in a layout effect rather than in CSS, so
 * there is no flash before the timeline starts and, if JavaScript never runs,
 * the page simply renders fully visible.
 */

/** Every participant, in the order the eye should meet it. */
const SELECTORS = {
  bubbles: '[data-enter="bubbles"]',
  logo: '[data-enter="logo"]',
  nav: '[data-enter="nav"]',
  contact: '[data-enter="contact"]',
  titleLines: '[data-enter="hero-title"] .line-inner',
  description: '[data-enter="hero-desc"]',
  cta: '[data-enter="hero-cta"]',
  cards: '[data-enter="hero-cards"] [data-enter-card]',
  sideLines: '[data-enter="hero-side"] .line-inner',
  badge: '[data-enter="hero-badge"]',
  search: '[data-enter="search"]',
} as const;

/**
 * Slots whose CHILDREN are what animate, not the slot itself.
 *
 * CSS pre-hides every `[data-enter]` element to stop the server-rendered hero
 * painting before the entrance runs. For these three the timeline only ever
 * touches the inner lines or cards, so the wrapper has to be handed back its
 * opacity immediately or it stays hidden for good and takes its animated
 * children down with it.
 */
const CHILD_ANIMATED_SLOTS = [
  '[data-enter="hero-title"]',
  '[data-enter="hero-side"]',
  '[data-enter="hero-cards"]',
] as const;

function query(selector: string): HTMLElement[] {
  return gsap.utils.toArray<HTMLElement>(selector);
}

/**
 * GSAP warns "target not found" and silently skips a tween when handed an empty
 * array, which turns a missing selector into an invisible failure. Guarding
 * here keeps the console clean and makes a genuinely missing slot obvious.
 */
function setIf(targets: HTMLElement[], vars: gsap.TweenVars): void {
  if (targets.length > 0) gsap.set(targets, vars);
}

function tweenIf(
  tl: gsap.core.Timeline,
  targets: HTMLElement[],
  vars: gsap.TweenVars,
  position: number,
): void {
  if (targets.length > 0) tl.to(targets, vars, position);
}

function fromToIf(
  tl: gsap.core.Timeline,
  targets: HTMLElement[],
  from: gsap.TweenVars,
  to: gsap.TweenVars,
  position: number,
): void {
  if (targets.length > 0) tl.fromTo(targets, from, to, position);
}

export function PageEntrance() {
  const reducedMotion = useReducedMotion();

  useIsomorphicLayoutEffect(() => {
    registerGsap();

    const groups = Object.fromEntries(
      Object.entries(SELECTORS).map(([key, selector]) => [key, query(selector)]),
    ) as Record<keyof typeof SELECTORS, HTMLElement[]>;

    // Re-read rather than capture: the stage publishes this on mount, and the
    // timeline starts asynchronously, so this stays correct even if the stage
    // were ever to mount after the entrance.
    const canReveal = () => stageRegistry.canReveal;
    const all = Object.values(groups).flat();
    if (all.length === 0) return;

    if (reducedMotion) {
      // No entrance, but nothing is left hidden either.
      gsap.set(all, { opacity: 1, y: 0, x: 0, yPercent: 0, scale: 1, filter: 'none' });
      const el = canReveal();
      if (el) gsap.set(el, { opacity: 1, scale: 1, filter: 'none' });
      return;
    }

    const hideCan = () => {
      const el = canReveal();
      if (el) gsap.set(el, { opacity: 0 });
    };
    hideCan();

    // Wrappers become visible straight away; only their contents are staged.
    setIf(CHILD_ANIMATED_SLOTS.flatMap(query), { opacity: 1 });

    // Hide before the browser paints. A layout effect is synchronous, so this
    // beats first paint and there is no flash of the un-animated composition.
    setIf(
      [
        ...groups.bubbles,
        ...groups.logo,
        ...groups.contact,
        ...groups.description,
        ...groups.badge,
      ],
      { opacity: 0 },
    );
    setIf(groups.nav, { opacity: 0, y: -14, scaleX: 0.86 });
    setIf([...groups.titleLines, ...groups.sideLines], { yPercent: 108, opacity: 0 });
    setIf(groups.cta, { opacity: 0, scale: 0.88 });
    setIf(groups.cards, { opacity: 0, y: 46, rotate: 7 });
    setIf(groups.search, { opacity: 0, y: 40 });

    let started = false;
    let cancelled = false;
    let ctx: gsap.Context | null = null;
    let failsafe = 0;
    let timeline: gsap.core.Timeline | null = null;
    let cleanupVisibility: (() => void) | null = null;
    let settled = false;

    /**
     * Guarantees the composition ends up visible.
     *
     * The entrance hides the entire page before it plays, so anything that stops
     * the timeline short leaves a blank gradient with an invisible product: the
     * worst failure this page has. Several things can stop it, and none of them
     * throw:
     *
     *   - no stage adapter registered yet, so `revealStage()` is never built and
     *     nothing ever un-hides the can that `hideCan()` already hid;
     *   - rAF throttled because the tab was backgrounded during the load gate,
     *     which parks the timeline mid-flight;
     *   - the fruit left flagged `owned`, so the stage ticker keeps skipping them.
     *
     * Idempotent, and a no-op on the normal path where the timeline completed.
     */
    const forceEndState = () => {
      // Marks the composition as settled by hand. Without this, a `start()` that
      // arrives after the failsafe has already revealed everything would call
      // `hideCan()` and re-stage the whole page, blanking a composition the
      // reader is already looking at. Slow first loads hit exactly that order.
      settled = true;
      gsap.set(all, { opacity: 1, x: 0, y: 0, yPercent: 0, scale: 1, scaleX: 1, rotate: 0, filter: 'none' });
      const el = canReveal();
      if (el) gsap.set(el, { opacity: 1, scale: 1, filter: 'none' });
      for (const fruit of stageRegistry.fruits) {
        gsap.set(fruit.el, { opacity: 1, scale: 1 });
        fruit.baseX = 0;
        fruit.baseY = 0;
        fruit.rx = 0;
        fruit.ry = 0;
        // Hand the transform back to the stage ticker, which is what actually
        // animates the fruit once the entrance is over.
        fruit.owned = false;
      }
      for (const leaf of stageRegistry.leaves) {
        gsap.set(leaf.el, { opacity: leaf.baseOpacity });
      }
    };

    /**
     * Armed from the moment the page is hidden, not from the moment the timeline
     * is built, because "the sequence never started" is itself one of the failure
     * modes: if the readiness gate never settles, a failsafe living inside
     * `start()` is never scheduled either, and the page stays blank forever.
     *
     * While the tab is in the background it re-arms instead of firing. rAF is
     * paused there, so a timeline that has not progressed is expected rather than
     * broken, and forcing the end state would burn the opening for someone who
     * simply opened the page in a background tab and came back.
     */
    const armFailsafe = () => {
      window.clearTimeout(failsafe);
      failsafe = window.setTimeout(() => {
        if (cancelled) return;
        if (document.visibilityState !== 'visible') {
          armFailsafe();
          return;
        }
        if (timeline && timeline.progress() < 1) timeline.progress(1, false);
        forceEndState();
        // 8s: the sequence runs 2.9s, and lag smoothing bounds a struggling
        // device to roughly double that. Anything still unfinished here is
        // stuck, not slow.
      }, 8000);
    };
    armFailsafe();

    const start = () => {
      if (started || cancelled || settled) return;
      started = true;
      hideCan();

      // Lag smoothing stays OFF for the entrance, deliberately.
      //
      // Capping how much time one frame may absorb was meant to stop a long
      // frame (a GLB finishing its decode) from advancing the timeline in a
      // single visible jump. In practice it converts a slow device into a
      // stuck one: if frames cost 2s and each may only absorb 250ms, a 1.15s
      // fade takes nine seconds of wall clock. Measured here at 12.9s.
      //
      // Without it the entrance is time-based rather than frame-based: a slow
      // machine renders fewer, coarser steps but the sequence still ends when
      // it should. For a one-shot intro that is the right trade, and on any
      // normal frame budget the setting was a no-op anyway.

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: EASE.editorial },
          onComplete: () => window.clearTimeout(failsafe),
        });
        // Published so the failsafe can finish the sequence off if it stalls.
        timeline = tl;

        // 1. The world settles. Carbonation comes up first and never stops.
        tweenIf(tl, groups.bubbles, { opacity: 1, duration: 1.2 }, 0);

        // 2. Chrome, quick and precise. It should be done before the eye
        //    finishes travelling to the headline.
        tweenIf(tl, groups.nav, { opacity: 1, y: 0, scaleX: 1, duration: 0.65, ease: 'power3.out' }, 0.05);
        tweenIf(tl, groups.logo, { opacity: 1, duration: 0.55, ease: EASE.ui }, 0.12);
        tweenIf(tl, groups.contact, { opacity: 1, duration: 0.55, ease: EASE.ui }, 0.18);

        // 3. The headline is typeset: each line slides out from behind its own
        //    baseline. Slow and confident, the longest move on the page.
        tweenIf(
          tl,
          groups.titleLines,
          { yPercent: 0, opacity: 1, duration: 1.15, stagger: 0.1 },
          0.25,
        );

        // 4. Supporting copy resolves out of a blur, quieter than the headline.
        fromToIf(
          tl,
          groups.description,
          { y: 22, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85 },
          0.62,
        );

        // 5. The CTA has weight: it lands with a controlled overshoot.
        tweenIf(
          tl,
          groups.cta,
          { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.2)' },
          0.8,
        );

        // 6. The range arrives with physical motion, rotating flat.
        tweenIf(
          tl,
          groups.cards,
          { opacity: 1, y: 0, rotate: 0, duration: 0.9, stagger: 0.09, ease: 'back.out(1.4)' },
          0.95,
        );

        // 7. The product.
        //
        // Deliberately NOT gated behind the copy any more. The can used to sit
        // at 1.15s of a timeline that itself waited for the GLB to decode, so
        // the two delays stacked and the hero's own subject was the last thing
        // to arrive, measured at nearly six seconds on a cold load.
        //
        // It now opens at 0.2s and runs long (1.7s), so it is resolving behind
        // the headline rather than queueing after the range. The can reads as
        // present from the start and slow to settle, which is weight; arriving
        // late and snapping to full opacity is just lateness.
        const stage = getStageAdapter()?.revealStage();
        if (stage) {
          tl.add(stage, 0.2);
        } else {
          // The stage owns the choreographed version of this, but the can was
          // already hidden by `hideCan()`. Without a fallback here, a missing
          // adapter means the product simply never appears. Plainer, on time,
          // and correct beats absent.
          const el = canReveal();
          if (el) {
            gsap.set(el, { opacity: 0, scale: 1.14, filter: 'blur(14px)' });
            tl.to(el, { opacity: 1, duration: 1.15, ease: 'power1.inOut' }, 0.2);
            tl.to(el, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0.2);
            tl.to(el, { filter: 'blur(0px)', duration: 1.35, ease: 'power2.out' }, 0.2);
          }
        }

        // 8. The secondary headline closes the composition.
        tweenIf(
          tl,
          groups.sideLines,
          { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.1 },
          1.75,
        );

        tweenIf(tl, groups.badge, { opacity: 1, duration: 0.7 }, 2.0);

        // 9. The search bar surfaces last, so it reads as an invitation rather
        //    than as page furniture.
        tweenIf(tl, groups.search, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 2.15);

        // Layout is final once the entrance has played out.
        tl.call(() => ScrollTrigger.refresh(), undefined, '>');
      });
    };

    // Two gates, both required, each with its own reason:
    //
    //   fonts   line masks are sized in em against the rendered display face.
    //           Playing against fallback metrics reveals at the wrong height
    //           and then reflows mid-tween.
    //   stage   the sequence builds to the can. Starting before its GLB has
    //           decoded means animating straight through the frame budget spike
    //           of four models and a 2048px texture, which is what makes the
    //           opening stutter on a cold load.
    //
    // Both caps are deliberately short. Everything on the page is hidden until
    // the timeline starts, so a generous gate would trade a stutter for a blank
    // gradient. 1200ms is long enough that the can usually wins on a warm load
    // and short enough that a cold one still opens promptly, just less smoothly.
    const GATE_MS = 1200;

    const fontsReady = document.fonts
      ? Promise.race([
          document.fonts.ready.then(() => undefined),
          new Promise<void>((r) => window.setTimeout(r, GATE_MS)),
        ])
      : Promise.resolve();

    /**
     * A third gate, and the one that actually bites in the wild: visibility.
     *
     * rAF is paused in a background tab, so a timeline started there does not
     * play, it parks. Worse, the entrance runs with lag smoothing on, which caps
     * how much time a single frame may absorb, so on return it would crawl
     * forward a fraction of a second per frame instead of catching up.
     *
     * Everything is hidden until the sequence runs, but that costs nothing while
     * nobody is looking. Waiting means someone who opens the page in a
     * background tab still gets the opening when they arrive, rather than a
     * stutter or a page that finished without them.
     */
    const startWhenVisible = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        start();
        return;
      }
      const onVisible = () => {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', onVisible);
        start();
      };
      document.addEventListener('visibilitychange', onVisible);
      cleanupVisibility = () =>
        document.removeEventListener('visibilitychange', onVisible);
    };

    void Promise.all([fontsReady, whenStageReady(GATE_MS)]).then(startWhenVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      cleanupVisibility?.();
      ctx?.revert();
    };
  }, [reducedMotion]);

  return null;
}
