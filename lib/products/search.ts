import { PRODUCTS, type Product } from '@/data/products';

/**
 * Matching for the floating search.
 *
 * Six products do not need an index or a fuzzy library. What they do need is a
 * ranking that puts the obvious answer first: typing "li" should surface Zero
 * Lime before Solar Citrus, even though both mention citrus somewhere.
 */

interface Scored {
  product: Product;
  score: number;
}

/** Higher is better. Returns 0 when the field does not match at all. */
function scoreField(field: string, query: string, weight: number): number {
  const value = field.toLowerCase();
  if (value === query) return weight * 4;
  if (value.startsWith(query)) return weight * 3;

  // Word-start matches read as intentional; mid-word ones are usually noise.
  const wordStart = value.split(/[\s-]+/).some((word) => word.startsWith(query));
  if (wordStart) return weight * 2;

  if (value.includes(query)) return weight;
  return 0;
}

export function searchProducts(rawQuery: string): Product[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const scored: Scored[] = [];

  for (const product of PRODUCTS) {
    let score = 0;
    score += scoreField(product.name, query, 10);
    score += scoreField(product.flavor, query, 6);
    score += scoreField(product.world.name, query, 3);

    // Take the best keyword hit and ADD it. Using Math.max against the running
    // total instead would let a keyword replace the name and flavour score
    // rather than reinforce it, so "ch" ranked Velvet Peach (a mid-word hit in
    // "white peach") above Diet Classic, whose flavour is literally "Orchard
    // Cherry" and whose keywords include "cherry".
    let best = 0;
    for (const keyword of product.keywords) {
      best = Math.max(best, scoreField(keyword, query, 4));
    }
    score += best;

    if (score > 0) scored.push({ product, score });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Stable tiebreak on catalogue order, so results never reshuffle between
      // keystrokes that score identically.
      return PRODUCTS.indexOf(a.product) - PRODUCTS.indexOf(b.product);
    })
    .map((entry) => entry.product);
}
