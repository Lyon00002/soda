/**
 * The product catalogue is the single source of content for the entire page.
 * Every section, the background palette, the 3D can colourway, the floating
 * fruit and the search index all derive from the active entry here.
 *
 * Asset reality check: the brand owns exactly two authored can textures
 * (green + blue) and two fruit meshes (cherry + blueberry). Six colourways are
 * produced by pairing a base texture with a deterministic recolour recipe that
 * is applied identically to the 3D texture (canvas -> blob -> model-viewer) and
 * to the 2D card render (CSS filter), so a product's can and its card always
 * agree. Nothing here references an asset that does not exist on disk.
 */

export type FruitModel = 'cherry' | 'blueberry';
export type BaseTexture = 'green' | 'blue';

/** A two-line display headline. Line 1 is the lighter "outline" line. */
export type DisplayLines = readonly [string, string];

export interface ColorWorld {
  /** Human-readable name, surfaced in the search suggestion row. */
  readonly name: string;
  /** Radial gradient stops, centre outward. Matches the prototype's three-stop system. */
  readonly inner: string;
  readonly mid: string;
  readonly outer: string;
  /** Atmospheric glow behind the can and under section type. */
  readonly aura: string;
}

/**
 * A recolour recipe. Applied via canvas `ctx.filter` for the GLB texture and
 * via CSS `filter` for the card image, so both stay in lockstep.
 * `hue` is degrees, `saturate` and `brightness` are multipliers (1 = unchanged).
 */
export interface Recolor {
  readonly hue: number;
  readonly saturate: number;
  readonly brightness: number;
}

/** A recipe that leaves the source untouched, so the pipeline can skip work entirely. */
export const NEUTRAL_RECOLOR: Recolor = { hue: 0, saturate: 1, brightness: 1 };

export function isNeutralRecolor(r: Recolor): boolean {
  return r.hue === 0 && r.saturate === 1 && r.brightness === 1;
}

export interface TastingNote {
  readonly name: string;
  readonly note: string;
}

export interface TasteMetric {
  readonly label: string;
  /** 0-100. Drives the bar geometry in the taste section. */
  readonly value: number;
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly flavor: string;
  readonly price: string;
  readonly world: ColorWorld;
  /** Drives the can's GLB texture and the 2D card render together. */
  readonly recolor: Recolor;
  readonly baseTexture: BaseTexture;
  readonly cardImage: string;
  readonly fruit: FruitModel;
  /**
   * Separate recipe for the floating fruit. The meshes start from different
   * hues than the can texture (cherry is red, blueberry is deep blue), so
   * reusing `recolor` here would send them to the wrong colour.
   */
  readonly fruitRecolor: Recolor;

  readonly hero: {
    readonly headline: DisplayLines;
    readonly side: DisplayLines;
    readonly description: readonly string[];
    readonly cta: string;
  };

  readonly story: {
    readonly title: DisplayLines;
    readonly body: readonly [string, string];
  };

  readonly ingredients: {
    readonly title: DisplayLines;
    /** Oversized word set behind the can. One word, rendered uppercase. */
    readonly word: string;
    readonly notes: readonly TastingNote[];
  };

  readonly taste: {
    readonly title: DisplayLines;
    readonly body: string;
    readonly metrics: readonly TasteMetric[];
  };

  /** Five short uppercase phrases, set as kinetic editorial rows. */
  readonly details: readonly string[];

  readonly final: {
    readonly headline: DisplayLines;
    readonly cta: string;
  };

  /** Extra tokens the search matches against beyond name and flavor. */
  readonly keywords: readonly string[];
}

const GREEN_CAN = '/assets/images/can-green.png';
const BLUE_CAN = '/assets/images/can-blue.png';

export const PRODUCTS: readonly Product[] = [
  {
    id: 'diet-classic',
    name: 'Diet Classic',
    flavor: 'Orchard Cherry',
    price: '$2.99',
    world: {
      name: 'Deep Emerald',
      inner: '#0b8a78',
      mid: '#044e3b',
      outer: '#011411',
      aura: 'rgba(16, 185, 129, 0.10)',
    },
    recolor: { hue: 0, saturate: 1, brightness: 1 },
    baseTexture: 'green',
    cardImage: GREEN_CAN,
    fruit: 'cherry',
    fruitRecolor: NEUTRAL_RECOLOR,
    hero: {
      headline: ['Pure', 'Zero'],
      side: ['Refreshingly', 'Clean'],
      description: [
        'Unleash the crisp taste of zero sugar.',
        'Refreshment redefined in every bubble,',
        'all in one sleek design.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Built on', 'Nothing'],
      body: [
        'The original recipe started as a subtraction. Take out the sugar, the syrup, the heaviness that settles on the tongue and stays there.',
        'What remains is orchard cherry over cold carbonation. One note, held clean, from the first sip to the last.',
      ],
    },
    ingredients: {
      title: ['Orchard', 'Cherry'],
      word: 'CHERRY',
      notes: [
        { name: 'Morello Cherry', note: 'Pressed at peak ripeness, never concentrated.' },
        { name: 'Cold Carbonation', note: 'Chilled to 2°C before gassing for a finer bead.' },
        { name: 'Mineral Water', note: 'Drawn from a single aquifer, filtered twice.' },
        { name: 'Citrus Peel', note: 'A trace of oil to lift the finish.' },
      ],
    },
    taste: {
      title: ['Cold', 'Clarity'],
      body: 'Sharp on entry, round through the middle, gone before it outstays itself. The finish is the point.',
      metrics: [
        { label: 'Sweetness', value: 28 },
        { label: 'Acidity', value: 62 },
        { label: 'Body', value: 41 },
      ],
    },
    details: ['ZERO SUGAR', 'ONE CALORIE', 'CRISP FINISH', 'COLD AROMA', 'RECYCLED SHELL'],
    final: {
      headline: ['Taste the', 'Absence'],
      cta: 'Shop Diet Classic',
    },
    keywords: ['classic', 'original', 'cherry', 'green', 'emerald', 'diet'],
  },

  {
    id: 'zero-lime',
    name: 'Zero Lime',
    flavor: 'Cold Pressed Lime',
    price: '$2.99',
    world: {
      name: 'Cobalt Cold',
      inner: '#0b4f8a',
      mid: '#04294e',
      outer: '#010c14',
      aura: 'rgba(56, 130, 246, 0.10)',
    },
    recolor: { hue: 0, saturate: 1, brightness: 1 },
    baseTexture: 'blue',
    cardImage: BLUE_CAN,
    fruit: 'blueberry',
    fruitRecolor: NEUTRAL_RECOLOR,
    hero: {
      headline: ['Sharp', 'Lime'],
      side: ['Unmistakably', 'Cold'],
      description: [
        'Lime pressed cold, never cooked.',
        'The acid stays bright, sugar stays out,',
        'and the bite arrives on time.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Cut with', 'Cold'],
      body: [
        'Heat flattens lime. It turns the oil bitter and the acid dull, which is why most lime soda tastes like a memory of lime.',
        'This one never sees a kettle. Pressed cold, blended cold, filled cold, so the top note survives all the way to the can.',
      ],
    },
    ingredients: {
      title: ['Green', 'Acid'],
      word: 'LIME',
      notes: [
        { name: 'Persian Lime', note: 'Whole fruit pressed, peel and all.' },
        { name: 'Kaffir Leaf', note: 'Steeped cold for twelve hours.' },
        { name: 'Sea Mineral', note: 'A pinch of salt to widen the acid.' },
        { name: 'Juniper Trace', note: 'Dry, resinous, almost not there.' },
      ],
    },
    taste: {
      title: ['Bright', 'Bite'],
      body: 'It opens with a snap of peel oil, then drops into something colder and flatter. Astringent in the best way.',
      metrics: [
        { label: 'Sweetness', value: 14 },
        { label: 'Acidity', value: 84 },
        { label: 'Body', value: 33 },
      ],
    },
    details: ['ZERO SUGAR', 'COLD PRESSED', 'HIGH ACID', 'PEEL FORWARD', 'RECYCLED SHELL'],
    final: {
      headline: ['Nothing but', 'Edge'],
      cta: 'Shop Zero Lime',
    },
    keywords: ['lime', 'zero', 'blue', 'cobalt', 'citrus', 'sour', 'cold'],
  },

  {
    id: 'wild-berry',
    name: 'Wild Berry',
    flavor: 'Bramble and Blackcurrant',
    price: '$3.29',
    world: {
      name: 'Bramble Violet',
      inner: '#6a2f8f',
      mid: '#331446',
      outer: '#0f0616',
      aura: 'rgba(168, 85, 247, 0.11)',
    },
    recolor: { hue: 62, saturate: 1.18, brightness: 0.94 },
    baseTexture: 'blue',
    cardImage: BLUE_CAN,
    fruit: 'blueberry',
    fruitRecolor: { hue: 22, saturate: 1.2, brightness: 0.98 },
    hero: {
      headline: ['Deep', 'Wild'],
      side: ['Impossibly', 'Dark'],
      description: [
        'Hedgerow fruit, picked late.',
        'Blackcurrant over bramble over water,',
        'with none of the syrup.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Picked', 'Late'],
      body: [
        'Berries harvested early are easy to work with and taste like nothing. The sugar has not moved yet and neither has the colour.',
        'These come off the cane in the last week they can, when the skins go matte and the juice runs almost black.',
      ],
    },
    ingredients: {
      title: ['Hedgerow', 'Fruit'],
      word: 'BRAMBLE',
      notes: [
        { name: 'Blackcurrant', note: 'The backbone. Tannic, dark, faintly green.' },
        { name: 'Wild Bramble', note: 'Hand picked from unmanaged hedge.' },
        { name: 'Elderflower', note: 'A single gram per hectolitre, for lift.' },
        { name: 'Oak Water', note: 'Rested on staves for a week before filling.' },
      ],
    },
    taste: {
      title: ['Low', 'Thunder'],
      body: 'Heavier than it looks. The fruit sits low and wide, then a tannin grip pulls the whole thing tight at the end.',
      metrics: [
        { label: 'Sweetness', value: 31 },
        { label: 'Acidity', value: 51 },
        { label: 'Body', value: 72 },
      ],
    },
    details: ['ZERO SUGAR', 'LATE HARVEST', 'TANNIC GRIP', 'DARK FRUIT', 'RECYCLED SHELL'],
    final: {
      headline: ['Into the', 'Dark'],
      cta: 'Shop Wild Berry',
    },
    keywords: ['berry', 'wild', 'bramble', 'blackcurrant', 'purple', 'violet', 'dark'],
  },

  {
    id: 'solar-citrus',
    name: 'Solar Citrus',
    flavor: 'Blood Orange and Bergamot',
    price: '$3.29',
    world: {
      name: 'Ember Amber',
      inner: '#b06a12',
      mid: '#5c2f06',
      outer: '#170a01',
      aura: 'rgba(251, 146, 60, 0.11)',
    },
    recolor: { hue: -108, saturate: 1.22, brightness: 1.04 },
    baseTexture: 'green',
    cardImage: GREEN_CAN,
    fruit: 'cherry',
    fruitRecolor: { hue: 24, saturate: 1.15, brightness: 1.16 },
    hero: {
      headline: ['Bright', 'Burn'],
      side: ['Relentlessly', 'Warm'],
      description: [
        'Blood orange with the pith left in.',
        'Bergamot on top, a slow heat underneath,',
        'and still no sugar at all.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Grown', 'Facing South'],
      body: [
        'Blood orange only turns if the nights get cold enough. The pigment is a stress response, which is a strange thing to build a drink on.',
        'The fruit comes from the south-facing terraces where that swing is sharpest, and the colour tells you before the label does.',
      ],
    },
    ingredients: {
      title: ['Sun', 'Fed'],
      word: 'SOLAR',
      notes: [
        { name: 'Blood Orange', note: 'Pressed with a third of the pith for grip.' },
        { name: 'Bergamot Oil', note: 'Cold expressed, added at the last stage.' },
        { name: 'Pink Peppercorn', note: 'Cracked, steeped, strained out again.' },
        { name: 'Volcanic Water', note: 'High mineral, drawn from basalt.' },
      ],
    },
    taste: {
      title: ['Slow', 'Heat'],
      body: 'Citrus at the front, then something warmer and drier moving in behind it. The pepper only shows up once the cold wears off.',
      metrics: [
        { label: 'Sweetness', value: 24 },
        { label: 'Acidity', value: 69 },
        { label: 'Body', value: 55 },
      ],
    },
    details: ['ZERO SUGAR', 'PITH PRESSED', 'BERGAMOT TOP', 'DRY FINISH', 'RECYCLED SHELL'],
    final: {
      headline: ['Chase the', 'Sun'],
      cta: 'Shop Solar Citrus',
    },
    keywords: ['citrus', 'solar', 'orange', 'blood orange', 'bergamot', 'amber', 'warm'],
  },

  {
    id: 'velvet-peach',
    name: 'Velvet Peach',
    flavor: 'White Peach and Salt',
    price: '$3.49',
    world: {
      name: 'Dusk Rose',
      inner: '#b04a5e',
      mid: '#54182a',
      outer: '#15060a',
      aura: 'rgba(251, 207, 232, 0.12)',
    },
    recolor: { hue: 196, saturate: 1.05, brightness: 1.02 },
    baseTexture: 'green',
    cardImage: GREEN_CAN,
    fruit: 'cherry',
    fruitRecolor: { hue: 9, saturate: 0.72, brightness: 1.26 },
    hero: {
      headline: ['Soft', 'Focus'],
      side: ['Quietly', 'Warm'],
      description: [
        'White peach, barely pressed.',
        'A line of salt to keep it from drifting,',
        'and nothing sweet to hide behind.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Held', 'Back'],
      body: [
        'Peach is the easiest flavour to overdo. Push it and you get candy, potpourri, the inside of a scented shop.',
        'So this one is deliberately underweight. The fruit is there and then it is not, and the salt is what stops it from turning into perfume.',
      ],
    },
    ingredients: {
      title: ['White', 'Peach'],
      word: 'VELVET',
      notes: [
        { name: 'White Peach', note: 'Two varieties, blended for texture rather than sweetness.' },
        { name: 'Flor de Sal', note: 'Hand raked, dissolved at fill.' },
        { name: 'Green Almond', note: 'For the faint bitterness underneath.' },
        { name: 'Soft Water', note: 'Low mineral, so nothing competes.' },
      ],
    },
    taste: {
      title: ['Long', 'Dusk'],
      body: 'Rounder and slower than the rest of the range. It does not snap, it fades, and the salt keeps the edges from going soft.',
      metrics: [
        { label: 'Sweetness', value: 34 },
        { label: 'Acidity', value: 39 },
        { label: 'Body', value: 66 },
      ],
    },
    details: ['ZERO SUGAR', 'SALT FINISHED', 'LOW ACID', 'SOFT WATER', 'RECYCLED SHELL'],
    final: {
      headline: ['Stay a', 'While'],
      cta: 'Shop Velvet Peach',
    },
    keywords: ['peach', 'velvet', 'rose', 'pink', 'salt', 'soft', 'stone fruit'],
  },

  {
    id: 'tropic-storm',
    name: 'Tropic Storm',
    flavor: 'Green Mango and Lemongrass',
    price: '$3.49',
    world: {
      name: 'Monsoon Green',
      inner: '#3f8f2e',
      mid: '#1d4a13',
      outer: '#071408',
      aura: 'rgba(132, 204, 22, 0.12)',
    },
    recolor: { hue: -110, saturate: 1.14, brightness: 1.03 },
    baseTexture: 'blue',
    cardImage: BLUE_CAN,
    fruit: 'blueberry',
    fruitRecolor: { hue: -125, saturate: 1.12, brightness: 1.18 },
    hero: {
      headline: ['Loud', 'Green'],
      side: ['Endlessly', 'Wild'],
      description: [
        'Unripe mango, cut hard.',
        'Lemongrass, chilli salt, cold rain,',
        'and absolutely no sugar.',
      ],
      cta: 'Shop Now',
    },
    story: {
      title: ['Before it', 'Ripens'],
      body: [
        'Green mango is sour, firm and faintly grassy. Nothing about it suggests a soft drink, which is exactly why it works as one.',
        'Cut it before the starch turns and you keep the acid and the bite. Wait a week and you have dessert instead.',
      ],
    },
    ingredients: {
      title: ['Green', 'Mango'],
      word: 'MONSOON',
      notes: [
        { name: 'Unripe Mango', note: 'Cut at nine weeks, while the flesh still resists.' },
        { name: 'Lemongrass', note: 'Bruised and steeped, never boiled.' },
        { name: 'Chilli Salt', note: 'Enough to register, not enough to burn.' },
        { name: 'Rain Water', note: 'Collected, filtered, remineralised.' },
      ],
    },
    taste: {
      title: ['High', 'Pressure'],
      body: 'Sour first, then grass, then a slow prickle at the back that has nothing to do with carbonation.',
      metrics: [
        { label: 'Sweetness', value: 19 },
        { label: 'Acidity', value: 78 },
        { label: 'Body', value: 47 },
      ],
    },
    details: ['ZERO SUGAR', 'UNRIPE CUT', 'CHILLI SALT', 'GRASS TOP', 'RECYCLED SHELL'],
    final: {
      headline: ['Ride the', 'Storm'],
      cta: 'Shop Tropic Storm',
    },
    keywords: ['tropic', 'storm', 'mango', 'lemongrass', 'chilli', 'green', 'sour', 'monsoon'],
  },
] as const;

export const DEFAULT_PRODUCT_ID = 'diet-classic';

/** Never returns undefined: falls back to the default entry, then to index 0. */
export function getProduct(id: string): Product {
  const found = PRODUCTS.find((p) => p.id === id);
  if (found) return found;
  const fallback = PRODUCTS.find((p) => p.id === DEFAULT_PRODUCT_ID) ?? PRODUCTS[0];
  if (!fallback) throw new Error('PRODUCTS is empty');
  return fallback;
}

export function getProductIndex(id: string): number {
  const i = PRODUCTS.findIndex((p) => p.id === id);
  return i === -1 ? 0 : i;
}

/** Wraps in both directions so the arrows never dead-end. */
export function getAdjacentProduct(id: string, delta: number): Product {
  const count = PRODUCTS.length;
  const next = (((getProductIndex(id) + delta) % count) + count) % count;
  const product = PRODUCTS[next];
  if (!product) throw new Error('PRODUCTS is empty');
  return product;
}
