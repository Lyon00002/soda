'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_PRODUCT_ID,
  PRODUCTS,
  getAdjacentProduct,
  getProduct,
  getProductIndex,
  type Product,
} from '@/data/products';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import {
  applyWorld,
  killTransition,
  runFlavorTransition,
} from '@/lib/stage/transitionController';

/**
 * One source of truth for the whole experience.
 *
 * Two product references are exposed deliberately:
 *
 *   activeProduct   the selection target. Updates the instant the user acts, so
 *                   the card highlight and search state feel immediate.
 *   displayProduct  the product whose copy is on screen. Swaps at the peak of
 *                   the transition, hidden behind the blur, so text never
 *                   changes in plain sight.
 *
 * Collapsing these into one value is what makes a product switch look like a
 * re-render instead of a cut.
 */

interface ProductContextValue {
  products: readonly Product[];
  activeProduct: Product;
  displayProduct: Product;
  activeIndex: number;
  isTransitioning: boolean;
  selectProduct: (id: string) => void;
  stepProduct: (delta: number) => void;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState(DEFAULT_PRODUCT_ID);
  const [displayId, setDisplayId] = useState(DEFAULT_PRODUCT_ID);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const reducedMotion = useReducedMotion();
  // The transition timeline is built once per switch and must not close over a
  // stale reduced-motion value, so read it through a ref at call time.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Paint the starting palette without animating it.
  useEffect(() => {
    applyWorld(getProduct(DEFAULT_PRODUCT_ID), 0);
    return () => killTransition();
  }, []);

  const selectProduct = useCallback((id: string) => {
    if (id === activeIdRef.current) return;
    const product = getProduct(id);
    if (product.id === activeIdRef.current) return;

    // Selection state leads; content follows at the midpoint.
    setActiveId(product.id);
    activeIdRef.current = product.id;
    setIsTransitioning(true);

    runFlavorTransition({
      product,
      reducedMotion: reducedMotionRef.current,
      // The controller passes back the product it actually reveals, which may
      // differ from `product` if a later click retargeted the timeline before
      // it reached the swap.
      onMidpoint: (revealed) => setDisplayId(revealed.id),
      onComplete: () => setIsTransitioning(false),
    });
  }, []);

  const stepProduct = useCallback(
    (delta: number) => {
      selectProduct(getAdjacentProduct(activeIdRef.current, delta).id);
    },
    [selectProduct],
  );

  const value = useMemo<ProductContextValue>(
    () => ({
      products: PRODUCTS,
      activeProduct: getProduct(activeId),
      displayProduct: getProduct(displayId),
      activeIndex: getProductIndex(activeId),
      isTransitioning,
      selectProduct,
      stepProduct,
    }),
    [activeId, displayId, isTransitioning, selectProduct, stepProduct],
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

export function useProduct(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used inside <ProductProvider>');
  }
  return context;
}
