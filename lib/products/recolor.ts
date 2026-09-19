import type { Product, Recolor } from '@/data/products';
import { isNeutralRecolor } from '@/data/products';
import type { ModelViewerElement, ModelViewerTexture } from '@/types/model-viewer';

/**
 * Six colourways from two authored textures.
 *
 * The same recipe is expressed twice, identically:
 *   - as a CSS `filter` on the 2D card render
 *   - as a canvas `ctx.filter` baked into a new base-colour texture for the GLB
 *
 * Because both paths use the same filter functions in the same order, a
 * product's card and its 3D can always land on the same colour.
 *
 * Everything degrades honestly: if `ctx.filter` is unavailable or the encode
 * fails, the pipeline falls back to the untouched base texture, which still
 * renders a correct-looking can.
 */

const BASE_TEXTURE: Record<Product['baseTexture'], string> = {
  green: '/assets/images/tex-green.jpg',
  blue: '/assets/images/tex-blue.jpg',
};

export function filterString(recolor: Recolor): string {
  if (isNeutralRecolor(recolor)) return 'none';
  const parts: string[] = [];
  if (recolor.hue !== 0) parts.push(`hue-rotate(${recolor.hue}deg)`);
  if (recolor.saturate !== 1) parts.push(`saturate(${recolor.saturate})`);
  if (recolor.brightness !== 1) parts.push(`brightness(${recolor.brightness})`);
  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/* Texture generation                                                  */
/* ------------------------------------------------------------------ */

/** productId -> object URL of the recoloured atlas. */
const textureUrlCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Same-origin (assets are vendored into /public), but this keeps the canvas
    // untainted even if the assets are ever moved to a CDN.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load texture: ${src}`));
    img.src = src;
  });
}

function canvasFilterSupported(): boolean {
  const probe = document.createElement('canvas').getContext('2d');
  return probe !== null && 'filter' in probe;
}

/**
 * Returns a URL for this product's base-colour texture, generating and caching
 * a recoloured variant when the recipe is not neutral.
 */
export async function getCanTextureUrl(product: Product): Promise<string> {
  const baseUrl = BASE_TEXTURE[product.baseTexture];
  if (isNeutralRecolor(product.recolor)) return baseUrl;

  const cached = textureUrlCache.get(product.id);
  if (cached) return cached;

  const pending = inFlight.get(product.id);
  if (pending) return pending;

  const task = (async (): Promise<string> => {
    try {
      if (!canvasFilterSupported()) return baseUrl;

      const img = await loadImage(baseUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return baseUrl;

      ctx.filter = filterString(product.recolor);
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) return baseUrl;

      const url = URL.createObjectURL(blob);
      textureUrlCache.set(product.id, url);
      return url;
    } catch {
      // A failed recolour is not worth breaking the page over.
      return baseUrl;
    }
  })();

  inFlight.set(product.id, task);
  // Cleared from OUTSIDE the async body on purpose. An async function runs
  // synchronously up to its first await, so a `finally` inside it would fire
  // before `inFlight.set` on the early-return paths and leave the entry
  // stranded in the map forever.
  void task.finally(() => inFlight.delete(product.id));
  return task;
}

/* ------------------------------------------------------------------ */
/* Applying to model-viewer                                            */
/* ------------------------------------------------------------------ */

/**
 * `createTexture` returns a texture bound to one model-viewer's scene, so the
 * result is cached per element as well as per product.
 */
const perElementTextures = new WeakMap<
  ModelViewerElement,
  Map<string, ModelViewerTexture>
>();

/**
 * Tracks the most recent request per element. Baking a texture spans two awaits
 * (blob generation, then createTexture), so two overlapping calls would
 * otherwise resolve last-to-finish rather than last-requested, and the can could
 * end up wearing a different colourway than the palette, copy and fruit.
 */
const latestRequest = new WeakMap<ModelViewerElement, string>();

export async function applyCanTexture(
  el: ModelViewerElement,
  product: Product,
): Promise<void> {
  if (!el.model) return;

  latestRequest.set(el, product.id);

  let byProduct = perElementTextures.get(el);
  if (!byProduct) {
    byProduct = new Map();
    perElementTextures.set(el, byProduct);
  }

  let texture = byProduct.get(product.id);
  if (!texture) {
    const url = await getCanTextureUrl(product);
    // A newer request landed while the blob was being generated.
    if (latestRequest.get(el) !== product.id) return;

    texture = await el.createTexture(url);
    byProduct.set(product.id, texture);
  }

  // ...and again after createTexture, which is the longer of the two awaits.
  if (latestRequest.get(el) !== product.id) return;
  if (!el.model) return;

  for (const material of el.model.materials) {
    // Only materials that already sample a base-colour texture can take one.
    material.pbrMetallicRoughness.baseColorTexture?.setTexture(texture);
  }
}


