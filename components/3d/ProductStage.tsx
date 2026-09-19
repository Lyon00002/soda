'use client';

import { useCallback, useRef } from 'react';

import { SECTION_IDS, lerpKeyframe, resolveKeyframe } from '@/data/stage';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useIsMobile, useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE, clamp, frameLerpFactor, smoothstep } from '@/lib/motion/easings';
import { gsap, ScrollTrigger, registerGsap } from '@/lib/motion/gsap';
import {
  measureAllFruit,
  stageRegistry,
  stageState,
} from '@/lib/stage/stageState';
import { signalStageReady } from '@/lib/stage/readiness';
import {
  registerStageAdapter,
  type StageAdapter,
} from '@/lib/stage/transitionController';
import { createRng, hashSeed, rangeFrom } from '@/lib/utils/prng';
import { useProduct } from '@/providers/ProductProvider';
import type { ModelViewerElement } from '@/types/model-viewer';

import {
  BACKGROUND_FRUIT,
  FOREGROUND_FRUIT,
  FruitLayer,
} from './FloatingFruits';
import { FloatingLeaves } from './FloatingLeaves';
import { ProductModel } from './ProductModel';
import styles from './ProductStage.module.css';
import { useModelViewer } from './useModelViewer';

/* --- Force-field constants, preserved from the prototype ---------------- */
const REPULSION_RADIUS = 400;
const REPULSION_STRENGTH = 80;
/** Cursor proximity multiplies each fruit's spin rate up to 6x. */
const SPIN_BOOST = 5;

const TAU = Math.PI * 2;

export function ProductStage() {
  const { displayProduct } = useProduct();
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  useModelViewer();

  const modelRef = useRef<ModelViewerElement | null>(null);

  // Narrow viewports carry a thinner atmosphere. This is a real reduction in
  // rendered meshes, not a CSS hide: an invisible model-viewer still costs a
  // draw call every frame.
  const foreground = isMobile ? FOREGROUND_FRUIT.slice(0, 3) : FOREGROUND_FRUIT;
  const background = isMobile ? BACKGROUND_FRUIT.slice(0, 1) : BACKGROUND_FRUIT;
  const leafCount = isMobile ? 2 : 4;

  const handleModel = useCallback((el: ModelViewerElement | null) => {
    modelRef.current = el;
  }, []);

  const handleReady = useCallback(() => {
    // The can is the tallest element in the composition; once it resolves the
    // section heights are final and every trigger boundary can be trusted.
    ScrollTrigger.refresh();
    // Releases the entrance, which deliberately waits for the product rather
    // than animating through its decode.
    signalStageReady();
  }, []);

  /**
   * The single DOM write for the product itself: one composed transform, one
   * opacity, one camera orbit. Shared by the per-frame ticker and by the
   * reduced-motion path, so there is exactly one place that decides how scroll,
   * pointer and transition spin combine.
   */
  const lastFilterRef = useRef('');
  const writeStage = useCallback((bob = 0) => {
    const state = stageState;
    const key = state.scroll;

    const model = modelRef.current;
    if (model) {
      const theta = key.theta + state.smooth.x * 40 + state.spin;
      const phi = clamp(key.phi + state.smooth.y * 20, 8, 172);
      model.cameraOrbit = `${theta}deg ${phi}deg ${key.radius}%`;

      // Only touch the filter when it actually changes: assigning a filter
      // string every frame invalidates the layer even when it is identical.
      const filter = state.blur > 0.05 ? `blur(${state.blur}px)` : '';
      if (filter !== lastFilterRef.current) {
        model.style.filter = filter;
        lastFilterRef.current = filter;
      }
    }

    const root = stageRegistry.root;
    if (root) {
      root.style.transform =
        `translate3d(${key.x}vw, ${key.y + bob}vh, 0) ` +
        `rotate(${key.rotate}deg) scale(${key.scale})`;
      root.style.opacity = `${key.opacity}`;
    }

    const glow = stageRegistry.glow;
    if (glow) glow.style.opacity = `${key.glow}`;
  }, []);

  /* ------------------------------------------------------------------ */
  /* Scroll boundaries                                                   */
  /* ------------------------------------------------------------------ */

  useIsomorphicLayoutEffect(() => {
    registerGsap();
    stageState.isMobile = isMobile;
    stageState.reducedMotion = reducedMotion;

    const frames = SECTION_IDS.map((id) => resolveKeyframe(id, isMobile));
    stageState.scrollTarget = frames[0] ?? stageState.scrollTarget;
    stageState.scroll = { ...stageState.scrollTarget };

    const triggers: ScrollTrigger[] = [];

    if (reducedMotion) {
      // No scrubbing, but the can must still reach each section's composition:
      // every layout below the hero is built around where the product sits, and
      // freezing it in the hero pose would drop it on top of the copy.
      //
      // So the keyframe is applied as a discrete state change when a section
      // becomes current, rather than as continuous scroll-linked motion.
      SECTION_IDS.forEach((id, index) => {
        const frame = frames[index];
        const element = document.getElementById(id);
        if (!frame || !element) return;

        triggers.push(
          ScrollTrigger.create({
            trigger: element,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => {
              if (!self.isActive) return;
              stageState.scrollTarget = frame;
              stageState.scroll = frame;
              // Hero atmosphere is present on the hero and gone everywhere
              // else. A state change rather than a scrubbed one.
              stageState.disperse = id === 'hero' ? 0 : 1;
              writeStage();
            },
          }),
        );
      });

      return () => {
        for (const trigger of triggers) trigger.kill();
      };
    }

    // One trigger per section boundary. Each covers exactly the viewport of
    // scroll immediately before its section lands, so the ranges are contiguous
    // and never overlap: only one boundary is ever mid-flight.
    SECTION_IDS.forEach((id, index) => {
      if (index === 0) return;
      const from = frames[index - 1];
      const to = frames[index];
      if (!from || !to) return;

      const element = document.getElementById(id);
      if (!element) return;

      triggers.push(
        ScrollTrigger.create({
          trigger: element,
          start: 'top bottom',
          end: 'top top',
          // Smoothstep the handoff so sections do not trade the can linearly.
          onUpdate: (self) => {
            stageState.scrollTarget = lerpKeyframe(
              from,
              to,
              smoothstep(self.progress),
            );
          },
          // Anchor jumps and fast flicks can skip a range entirely; clamping on
          // the way out guarantees the can never strands between compositions.
          onLeave: () => {
            stageState.scrollTarget = to;
          },
          onLeaveBack: () => {
            stageState.scrollTarget = from;
          },
        }),
      );
    });

    // The fruit and leaves belong to the hero, not to the document. Scrolling
    // the hero away splits them left and right and fades them out, so the
    // editorial sections below are carried by the product and the type alone.
    // Scrubbed rather than triggered, so the split tracks the scroll exactly and
    // reverses cleanly on the way back up.
    const hero = document.getElementById('hero');
    if (hero) {
      triggers.push(
        ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => {
            stageState.disperse = self.progress;
          },
          onLeave: () => {
            stageState.disperse = 1;
          },
          onLeaveBack: () => {
            stageState.disperse = 0;
          },
        }),
      );
    }

    return () => {
      for (const trigger of triggers) trigger.kill();
    };
  }, [isMobile, reducedMotion, writeStage]);

  /* ------------------------------------------------------------------ */
  /* Pointer                                                             */
  /* ------------------------------------------------------------------ */

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion) {
      // The listeners and the ticker both stop here, and neither resets what
      // they last wrote. Clearing it means a mid-session flip to reduce leaves
      // the can centred rather than frozen at the last cursor offset.
      const { pointer, smooth } = stageState;
      pointer.x = pointer.y = smooth.x = smooth.y = 0;
      pointer.px = pointer.py = smooth.px = smooth.py = -9999;
      pointer.engaged = false;
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const pointer = stageState.pointer;
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
      pointer.px = event.clientX;
      pointer.py = event.clientY;
      if (!pointer.engaged) {
        // Seed the smoothed value so the first movement eases from where the
        // cursor actually is rather than sweeping in from the origin.
        stageState.smooth.px = event.clientX;
        stageState.smooth.py = event.clientY;
        pointer.engaged = true;
      }
    };

    const onPointerLeave = () => {
      const pointer = stageState.pointer;
      pointer.x = 0;
      pointer.y = 0;
      pointer.px = -9999;
      pointer.py = -9999;
    };

    // Coarse pointers have no hover, so the force field would only ever fire on
    // tap. Skipping the listener there saves the work entirely.
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [reducedMotion]);

  /* ------------------------------------------------------------------ */
  /* Resize                                                              */
  /* ------------------------------------------------------------------ */

  useIsomorphicLayoutEffect(() => {
    const onResize = () => {
      measureAllFruit();
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ------------------------------------------------------------------ */
  /* The single render loop                                              */
  /* ------------------------------------------------------------------ */

  useIsomorphicLayoutEffect(() => {
    registerGsap();
    measureAllFruit();

    // Opacity on the atmosphere is shared with the entrance timeline and with
    // the flavour transition. The ticker only claims it while a dispersal is
    // actually in play, and for one final frame after it returns to zero so the
    // restore is not skipped. Outside that window GSAP is the only writer.
    let prevDisperse = 0;

    const tick = (time: number, deltaMs: number) => {
      const state = stageState;
      const { fruitFg, fruitBg, leafLayer } = stageRegistry;

      /* 1. Smooth the raw pointer. Frame-rate independent so a 120Hz display
            does not converge twice as fast as a 60Hz one. */
      const ease = frameLerpFactor(0.06, deltaMs);
      state.smooth.x += (state.pointer.x - state.smooth.x) * ease;
      state.smooth.y += (state.pointer.y - state.smooth.y) * ease;
      state.smooth.px += (state.pointer.px - state.smooth.px) * ease;
      state.smooth.py += (state.pointer.py - state.smooth.py) * ease;

      /* 2. Ease the composed keyframe toward the scroll target. */
      const settle = frameLerpFactor(0.11, deltaMs);
      state.scroll = lerpKeyframe(state.scroll, state.scrollTarget, settle);

      /* 3. Compose the can. Scroll sets the base, the pointer adds influence,
            the transition adds spin. Nothing overwrites anything.
            The slow vertical bob is folded into the same transform, so the
            float and the scroll choreography can never fight over it. */
      writeStage(Math.sin(time * 0.55) * 1.15);

      /* 4. Parallax containers. Foreground travels with the cursor, background
            against it, leaves barely at all. That spread is the depth cue. */
      const px = state.smooth.x;
      const py = state.smooth.y;
      if (fruitFg) {
        fruitFg.style.transform = `translate3d(${px * 60}px, ${py * 60}px, 0)`;
      }
      if (fruitBg) {
        fruitBg.style.transform = `translate3d(${px * -30}px, ${py * -30}px, 0)`;
      }
      if (leafLayer) {
        leafLayer.style.transform = `translate3d(${px * -15}px, ${py * -15}px, 0)`;
      }

      /* 5. Fruit: force field, plus the hero dispersal.
            Past the hero the fruit split left and right and clear the frame, so
            the sections below belong to the product and the type. */
      const frameScale = Math.min(deltaMs, 100) / (1000 / 60);
      const halfWidth = window.innerWidth / 2;
      // Eased so the split starts gently and accelerates away.
      const spread = state.disperse * state.disperse * (halfWidth + 260);
      const atmosphereAlpha = 1 - clamp(state.disperse * 1.45, 0, 1);
      const ownsAlpha = state.disperse > 0.0005 || prevDisperse > 0.0005;
      prevDisperse = state.disperse;

      for (const fruit of stageRegistry.fruits) {
        // During a flavour transition GSAP owns these transforms outright.
        // Writing here too is what made the prototype's fruit stutter mid-swap.
        if (fruit.owned) continue;

        const parallaxX = fruit.depth === 1 ? px * 60 : px * -30;
        const parallaxY = fruit.depth === 1 ? py * 60 : py * -30;

        const screenX = fruit.layoutX + parallaxX + fruit.rx + fruit.baseX;
        const screenY = fruit.layoutY + parallaxY + fruit.ry + fruit.baseY;

        const dx = state.pointer.px - screenX;
        const dy = state.pointer.py - screenY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let targetRx = 0;
        let targetRy = 0;
        let spinRate = 1;

        if (
          state.pointer.engaged &&
          distance < REPULSION_RADIUS &&
          distance > 0.001
        ) {
          // Force rises linearly as the cursor closes, and pushes the fruit
          // directly away along the cursor vector.
          const force = (REPULSION_RADIUS - distance) / REPULSION_RADIUS;
          targetRx = (dx / distance) * force * -REPULSION_STRENGTH;
          targetRy = (dy / distance) * force * -REPULSION_STRENGTH;
          spinRate = 1 + force * SPIN_BOOST;
        }

        const repel = frameLerpFactor(0.1, deltaMs);
        fruit.rx += (targetRx - fruit.rx) * repel;
        fruit.ry += (targetRy - fruit.ry) * repel;
        fruit.angle += 0.2 * spinRate * frameScale;

        const phase = (time + fruit.floatPhase) * (TAU / fruit.floatPeriod);
        const floatY = Math.sin(phase) * fruit.floatAmp;
        const floatAngle = Math.cos(phase) * 6;

        // Each piece leaves toward the nearer edge, so the group parts down the
        // middle rather than sliding off as a block.
        const exitDirection = fruit.layoutX < halfWidth ? -1 : 1;
        const exitX = exitDirection * spread;
        // A touch of counter-rotation and shrink so they read as being carried
        // away rather than simply translated.
        const exitSpin = exitDirection * state.disperse * 90;
        const exitScale = 1 - state.disperse * 0.25;

        // Scale is written explicitly so the transform stays complete: GSAP
        // leaves the fruit at scale 1 after an explode and this must not drop it.
        fruit.el.style.transform =
          `translate3d(${fruit.rx + fruit.baseX + exitX}px, ` +
          `${fruit.ry + fruit.baseY + floatY}px, 0) ` +
          `rotate(${fruit.angle + floatAngle + exitSpin}deg) scale(${exitScale})`;

        // Safe to own opacity here: during a flavour transition `owned` is true
        // and this whole branch is skipped, so GSAP is never contradicted.
        if (ownsAlpha) fruit.el.style.opacity = `${atmosphereAlpha}`;
      }

      /* 6. Leaves. Slowest layer, never reacts to the cursor. */
      for (const leaf of stageRegistry.leaves) {
        const phase = (time + leaf.floatPhase) * (TAU / leaf.floatPeriod);
        const floatY = Math.sin(phase) * 20;
        const floatX = Math.cos(phase * 0.5) * 15;
        const angle = Math.sin(phase * 0.3) * 15;

        // Leaves are part of the same hero atmosphere, so they clear the frame
        // with the fruit. Left behind on their own they read as a leftover
        // drifting through the editorial sections.
        const leafDirection = leaf.el.offsetLeft < halfWidth ? -1 : 1;
        const exitX = leafDirection * spread * 0.8;

        leaf.el.style.transform =
          `translate3d(${floatX + exitX}px, ${floatY}px, 0) rotate(${angle}deg)`;
        if (ownsAlpha) {
          leaf.el.style.opacity = `${leaf.baseOpacity * atmosphereAlpha}`;
        }
      }
    };

    if (reducedMotion) {
      // Compose exactly once so the can, fruit and leaves all land in their
      // resting positions, then never run again. Snapping `scroll` to the
      // target first skips the easing, which would otherwise leave the stage
      // half way to its keyframe.
      stageState.scroll = { ...stageState.scrollTarget };
      tick(0, 16);
      return;
    }

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [reducedMotion, writeStage]);

  /* ------------------------------------------------------------------ */
  /* Flavour transition adapter                                          */
  /* ------------------------------------------------------------------ */

  useIsomorphicLayoutEffect(() => {
    if (reducedMotion) {
      registerStageAdapter(null);
      return;
    }

    const adapter: StageAdapter = {
      revealStage() {
        const tl = gsap.timeline();
        const reveal = stageRegistry.canReveal;

        // The can resolves out of the background: slightly oversized and out of
        // focus, settling to its hero framing. Blur doing the work rather than
        // a fade is what makes it read as a lens finding the product.
        //
        // This runs on the reveal wrapper, not on the ticker-owned stage, so
        // the two never write the same property.
        if (reveal) {
          gsap.set(reveal, { opacity: 0, scale: 1.14, filter: 'blur(14px)' });

          // Three properties, three curves, on purpose.
          //
          // Driving all of them off one `expo.out` is what made the can appear
          // to snap into existence: expo.out reaches 65% of its travel in the
          // first 15% of the tween, which is exactly right for a line of type
          // sliding into place and exactly wrong for a fade. The opacity was
          // effectively a cut with a long tail nobody can see.
          //
          // Opacity now rises evenly, so the product genuinely fades up, while
          // scale and blur keep an eased-out settle that supplies the weight.
          tl.to(reveal, { opacity: 1, duration: 1.15, ease: 'power1.inOut' }, 0);
          tl.to(reveal, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0);
          tl.to(
            reveal,
            { filter: 'blur(0px)', duration: 1.35, ease: 'power2.out' },
            0,
          );
        }

        // Fruit arrive with the same gesture the flavour switch uses, so the
        // entrance teaches the interaction language before the user triggers it.
        stageRegistry.fruits.forEach((fruit, i) => {
          fruit.owned = true;
          gsap.set(fruit.el, { x: 0, y: 0, scale: 0.05, opacity: 0 });

          tl.to(
            fruit.el,
            {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 1.05,
              ease: EASE.organic,
              onComplete: () => {
                fruit.baseX = 0;
                fruit.baseY = 0;
                fruit.rx = 0;
                fruit.ry = 0;
                fruit.owned = false;
              },
            },
            0.55 + i * 0.05,
          );
        });

        for (const leaf of stageRegistry.leaves) {
          tl.fromTo(
            leaf.el,
            { opacity: 0 },
            { opacity: leaf.baseOpacity, duration: 1.1, ease: EASE.editorial },
            0.75,
          );
        }

        return tl;
      },

      implodeFruit() {
        const tl = gsap.timeline();
        const centreX = window.innerWidth / 2;
        const centreY = window.innerHeight / 2;

        stageRegistry.fruits.forEach((fruit, i) => {
          // Hand the transform to GSAP for the duration of the swap.
          fruit.owned = true;
          gsap.set(fruit.el, {
            x: fruit.rx + fruit.baseX,
            y: fruit.ry + fruit.baseY,
            rotation: fruit.angle,
            scale: 1,
          });

          tl.to(
            fruit.el,
            {
              x: centreX - fruit.layoutX,
              y: centreY - fruit.layoutY,
              rotation: fruit.angle + 45,
              scale: 0.08,
              opacity: 0,
              duration: 0.48,
              ease: 'power2.in',
            },
            i * 0.028,
          );
        });

        return tl;
      },

      explodeFruit() {
        const tl = gsap.timeline();
        const rng = createRng(hashSeed(`explode-${Date.now()}`));

        stageRegistry.fruits.forEach((fruit, i) => {
          const nextX = rangeFrom(rng, -100, 100);
          const nextY = rangeFrom(rng, -100, 100);
          const nextAngle = fruit.angle + 90;

          tl.to(
            fruit.el,
            {
              x: nextX,
              y: nextY,
              rotation: nextAngle,
              scale: 1,
              opacity: 1,
              duration: 0.9,
              ease: EASE.organic,
              onComplete: () => {
                // Fold GSAP's final values back into the simulation and hand
                // control to the ticker. Without this the next frame would snap
                // the fruit back to its pre-transition offset.
                fruit.baseX = nextX;
                fruit.baseY = nextY;
                fruit.rx = 0;
                fruit.ry = 0;
                fruit.angle = nextAngle;
                fruit.owned = false;
              },
            },
            i * 0.04,
          );
        });

        return tl;
      },

      copyOut() {
        const tl = gsap.timeline();
        const lines = gsap.utils.toArray<HTMLElement>('[data-swap-line]');
        const blocks = gsap.utils.toArray<HTMLElement>('[data-swap-block]');

        if (lines.length) {
          tl.to(
            lines,
            {
              yPercent: -108,
              opacity: 0,
              duration: 0.42,
              ease: 'power3.in',
              stagger: 0.035,
            },
            0,
          );
        }
        if (blocks.length) {
          tl.to(
            blocks,
            {
              opacity: 0,
              y: -14,
              filter: 'blur(6px)',
              duration: 0.36,
              ease: 'power2.in',
              stagger: 0.02,
            },
            0.04,
          );
        }
        return tl;
      },

      copyIn() {
        const tl = gsap.timeline();
        const lines = gsap.utils.toArray<HTMLElement>('[data-swap-line]');
        const blocks = gsap.utils.toArray<HTMLElement>('[data-swap-block]');

        if (lines.length) {
          tl.fromTo(
            lines,
            { yPercent: 108, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.95,
              ease: EASE.editorial,
              stagger: 0.045,
            },
            0,
          );
        }
        if (blocks.length) {
          tl.fromTo(
            blocks,
            { opacity: 0, y: 16, filter: 'blur(6px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.8,
              ease: EASE.editorial,
              stagger: 0.03,
            },
            0.12,
          );
        }
        return tl;
      },
    };

    registerStageAdapter(adapter);
    return () => registerStageAdapter(null);
  }, [reducedMotion]);

  /* ------------------------------------------------------------------ */

  return (
    <>
      {/* `inert` as well as aria-hidden: every model-viewer bakes a
          tabindex="0" div into its shadow root, and aria-hidden on the host
          does not remove those from the tab order. Without inert the page has
          14 invisible tab stops before the first real control. */}
      <div className={styles.back} aria-hidden="true" inert>
        <div
          className={styles.glow}
          ref={(el) => {
            stageRegistry.glow = el;
          }}
        />

        <FloatingLeaves
          count={leafCount}
          onContainer={(el) => {
            stageRegistry.leafLayer = el;
          }}
        />

        <FruitLayer
          product={displayProduct}
          specs={background}
          depth={-1}
          seedOffset={6}
          onContainer={(el) => {
            stageRegistry.fruitBg = el;
          }}
        />

        <div
          className={styles.canStage}
          ref={(el) => {
            stageRegistry.root = el;
          }}
        >
          <div
            className={styles.canReveal}
            data-enter-stage=""
            ref={(el) => {
              stageRegistry.canReveal = el;
            }}
          >
            <ProductModel
              product={displayProduct}
              onElement={handleModel}
              onReady={handleReady}
            />
          </div>
        </div>
      </div>

      <div className={styles.front} aria-hidden="true" inert>
        <FruitLayer
          product={displayProduct}
          specs={foreground}
          depth={1}
          seedOffset={0}
          onContainer={(el) => {
            stageRegistry.fruitFg = el;
          }}
        />
      </div>
    </>
  );
}
