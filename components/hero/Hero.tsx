'use client';

import { DisplayHeading } from '@/components/motion/DisplayHeading';
import { ProductSelector } from '@/components/product/ProductSelector';
import { scrollToSection } from '@/lib/motion/lenisController';
import { useProduct } from '@/providers/ProductProvider';

import styles from './Hero.module.css';

/**
 * Section one. The prototype's hero, unchanged in composition and now driven
 * entirely by the active product: headline, secondary headline, description and
 * CTA all come from the catalogue.
 *
 * Nothing here self-reveals. The entrance timeline owns the whole opening
 * sequence so the order is authored in one place.
 */
export function Hero() {
  const { displayProduct } = useProduct();
  const { hero } = displayProduct;

  return (
    <section id="hero" className={styles.hero} aria-label="Introduction">
      <div className={styles.content}>
        <div className={styles.left}>
          <DisplayHeading
            as="h1"
            lines={hero.headline}
            className={styles.title}
            reveal={false}
            data-enter="hero-title"
          />

          <p className={styles.description} data-enter="hero-desc" data-swap-block="">
            {hero.description.map((line, i) => (
              <span key={i}>
                {line}
                {i < hero.description.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>

          <div data-enter="hero-cta">
            <button
              type="button"
              className={styles.cta}
              onClick={() => scrollToSection('final')}
            >
              <span data-swap-block="">{hero.cta}</span>
              <span className={styles.plus} aria-hidden="true">
                +
              </span>
            </button>
          </div>

          <div className={styles.badge} data-enter="hero-badge">
            <div className={styles.badgeIcon} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15L15 18L19 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 10L12 15L17 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.badgeText}>
              <span className={styles.badgeTitle}>DESIGN AWARDS</span>
              <span className={styles.badgeSubtitle}>PREMIUM BEVERAGE 2025</span>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <ProductSelector />

          <DisplayHeading
            lines={hero.side}
            className={styles.sideTitle}
            reveal={false}
            data-enter="hero-side"
          />
        </div>
      </div>
    </section>
  );
}
