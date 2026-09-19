'use client';

import { useEffect, useState } from 'react';

/**
 * `@google/model-viewer` registers a custom element and touches `window` at
 * import time, so it can only be pulled in on the client and only once.
 *
 * Elements already in the DOM are upgraded automatically when the definition
 * lands, so components can render `<model-viewer>` immediately and let the
 * upgrade catch up. The returned flag is only for gating behaviour that needs
 * the element's JS API (textures, camera writes), not for gating markup.
 */

let loader: Promise<void> | null = null;

function loadModelViewer(): Promise<void> {
  if (loader) return loader;
  loader = import('@google/model-viewer').then(() => undefined);
  return loader;
}

export function useModelViewer(): boolean {
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && !!customElements.get('model-viewer'),
  );

  useEffect(() => {
    let cancelled = false;
    void loadModelViewer().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
