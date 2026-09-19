'use client';

import { useEffect, useRef } from 'react';

import { getAdjacentProduct, type Product } from '@/data/products';
import { applyCanTexture, getCanTextureUrl } from '@/lib/products/recolor';
import type { ModelViewerElement } from '@/types/model-viewer';

import styles from './ProductStage.module.css';

interface ProductModelProps {
  product: Product;
  /** Handed back so the stage ticker can write the camera without re-querying. */
  onElement: (el: ModelViewerElement | null) => void;
  onReady: () => void;
}

/**
 * The can. One model-viewer instance for the whole page: the mesh never
 * changes, only its base-colour texture does, which is far cheaper than
 * swapping GLBs and keeps the camera continuous across a flavour change.
 *
 * Camera orbit is written by the stage ticker, not here, so that scroll,
 * pointer and transition spin can compose into a single value per frame.
 */
export function ProductModel({ product, onElement, onReady }: ProductModelProps) {
  const ref = useRef<ModelViewerElement | null>(null);
  const loadedRef = useRef(false);

  // Bind the colourway whenever the displayed product changes. Because the
  // provider only advances `displayProduct` at the peak of the spin, this lands
  // while the can is blurred and turning.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const bind = () => {
      if (cancelled) return;
      void applyCanTexture(el, product);
    };

    if (loadedRef.current || el.loaded) {
      bind();
      return () => {
        cancelled = true;
      };
    }

    el.addEventListener('load', bind, { once: true });
    return () => {
      cancelled = true;
      el.removeEventListener('load', bind);
    };
  }, [product]);

  // Bake the neighbouring colourways once the page is idle. The arrows and the
  // search both step to adjacent products constantly, and generating a 2048px
  // texture on the critical path of a transition is exactly the stutter the
  // spin is meant to hide.
  useEffect(() => {
    const neighbours = [
      getAdjacentProduct(product.id, 1),
      getAdjacentProduct(product.id, -1),
    ];

    const warm = () => {
      for (const neighbour of neighbours) void getCanTextureUrl(neighbour);
    };

    const idle = window.requestIdleCallback;
    if (typeof idle === 'function') {
      const handle = idle(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(timer);
  }, [product.id]);

  return (
    <model-viewer
      ref={(el: ModelViewerElement | null) => {
        ref.current = el;
        onElement(el);
      }}
      className={styles.can}
      src="/assets/models/soda-can.glb"
      alt={`${product.name}, a ${product.flavor} soda can, rotating in 3D`}
      environment-image="neutral"
      exposure="1.5"
      shadow-intensity="0"
      interaction-prompt="none"
      camera-orbit="0deg 90deg 380%"
      field-of-view="30deg"
      disable-zoom
      disable-pan
      disable-tap
      loading="eager"
      onLoad={() => {
        loadedRef.current = true;
        onReady();
      }}
    />
  );
}
