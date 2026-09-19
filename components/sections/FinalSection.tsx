'use client';

import { DisplayHeading, Reveal } from '@/components/motion/DisplayHeading';
import { scrollToSection } from '@/lib/motion/lenisController';
import { useProduct } from '@/providers/ProductProvider';

import styles from './Sections.module.css';

/**
 * Section six. The can returns to the centre at hero scale and the journey
 * closes where it opened.
 *
 * This is the only centred composition on the page, which is what makes it read
 * as an ending rather than as another section.
 *
 * The action shares its verb with the hero CTA ("Shop"), deliberately: one
 * intent should not be dressed in two different labels. The closing button just
 * names the product the user actually arrived at.
 */
export function FinalSection() {
  const { displayProduct } = useProduct();
  const { final } = displayProduct;

  return (
    <section id="final" className={`${styles.section} ${styles.final}`} aria-label="Get the range">
      <div className={`${styles.inner} ${styles.finalInner}`}>
        <DisplayHeading lines={final.headline} className={styles.finalTitle} />

        <Reveal delay={0.2}>
          {/* A button, not a link. There is no product route to navigate to, and
              an <a href="#..."> pointing at an id nothing renders, neutered by
              preventDefault, is a false affordance: it advertises navigation in
              the status bar and on middle-click, then does nothing. This returns
              the reader to the range with the product still selected. */}
          <button
            type="button"
            className={styles.finalCta}
            onClick={() => scrollToSection('hero')}
          >
            <span data-swap-block="">{final.cta}</span>
            <span className={styles.finalArrow} aria-hidden="true">
              &#8594;
            </span>
          </button>
        </Reveal>

        <Reveal delay={0.3}>
          <p className={styles.finalMeta} data-swap-block="">
            {displayProduct.flavor} &middot; {displayProduct.price}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
