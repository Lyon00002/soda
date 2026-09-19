'use client';

import { ProductStage } from '@/components/3d/ProductStage';
import { Hero } from '@/components/hero/Hero';
import { PageEntrance } from '@/components/layout/PageEntrance';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { BubbleField } from '@/components/motion/BubbleField';
import { Header } from '@/components/navigation/Header';
import { ProductSearch } from '@/components/product-search/ProductSearch';
import { DetailsSection } from '@/components/sections/DetailsSection';
import { FinalSection } from '@/components/sections/FinalSection';
import { IngredientsSection } from '@/components/sections/IngredientsSection';
import { StorySection } from '@/components/sections/StorySection';
import { TasteSection } from '@/components/sections/TasteSection';
import { ProductProvider, useProduct } from '@/providers/ProductProvider';

/**
 * Every string on the page is replaced during a flavour change. `aria-busy`
 * tells assistive technology to hold off until the swap settles instead of
 * announcing a half-updated document.
 */
function ExperienceMain({ children }: { children: React.ReactNode }) {
  const { isTransitioning, displayProduct } = useProduct();
  return (
    <>
      {/* Changing flavour rewrites every heading and paragraph on the page
          without moving focus. Announcing the result once the swap settles is
          the only signal a screen reader gets that anything happened. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isTransitioning ? '' : `${displayProduct.name}, ${displayProduct.flavor}`}
      </p>
      <main aria-busy={isTransitioning}>{children}</main>
    </>
  );
}

/**
 * The experience shell.
 *
 * Layer order is deliberate and matches the token scale in globals.css:
 *
 *   world      the radial gradient, fixed, behind everything
 *   bubbles    continuous carbonation, spanning every section
 *   stage back leaves, background fruit and the can  (BEHIND the copy)
 *   sections   the scrolling document
 *   stage front foreground fruit                     (IN FRONT of the copy)
 *   search     the floating dock
 *   header     the glass navigation
 */
export function ProductExperience() {
  return (
    <ProductProvider>
      <div className="world" aria-hidden="true" />

      <SmoothScroll />

      {/* ProductStage MUST be mounted before PageEntrance. React attaches refs
          and runs layout effects in a single tree-order pass, so an entrance
          rendered first would read stageRegistry.canReveal before the stage has
          published it, and the can would flash in un-hidden before its reveal. */}
      <BubbleField />
      <ProductStage />
      <PageEntrance />

      <Header />

      <ExperienceMain>
        <Hero />
        <StorySection />
        <IngredientsSection />
        <TasteSection />
        <DetailsSection />
        <FinalSection />
      </ExperienceMain>

      <ProductSearch />
    </ProductProvider>
  );
}
