'use client';

import { useState } from 'react';

import { NAV_ITEMS, SECTION_IDS, type SectionId } from '@/data/stage';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { ScrollTrigger, registerGsap } from '@/lib/motion/gsap';
import { scrollToSection } from '@/lib/motion/lenisController';

import styles from './Header.module.css';

/**
 * The glass navigation from the prototype, now pointing at real sections.
 *
 * Every label maps 1:1 onto a section that exists, so nothing here is a dead
 * link, and the active state is derived from scroll position rather than from
 * whichever item was clicked last.
 */
export function Header() {
  const [activeSection, setActiveSection] = useState<SectionId>('hero');

  useIsomorphicLayoutEffect(() => {
    registerGsap();

    const triggers = SECTION_IDS.map((id) => {
      const element = document.getElementById(id);
      if (!element) return null;

      return ScrollTrigger.create({
        trigger: element,
        // A section owns the nav once it covers the middle of the viewport,
        // which is where the eye actually is.
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) setActiveSection(id);
        },
      });
    }).filter((trigger): trigger is ScrollTrigger => trigger !== null);

    return () => {
      for (const trigger of triggers) trigger.kill();
    };
  }, []);

  return (
    <header className={styles.header}>
      <a
        className={styles.logo}
        href="#hero"
        data-enter="logo"
        onClick={(event) => {
          event.preventDefault();
          scrollToSection('hero');
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 8V16M8 12H16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>Soda</span>
      </a>

      <nav className={styles.nav} data-enter="nav" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            className={styles.navItem}
            href={`#${item.id}`}
            aria-current={activeSection === item.id}
            onClick={(event) => {
              event.preventDefault();
              scrollToSection(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className={styles.contact}
        data-enter="contact"
        onClick={() => scrollToSection('final')}
      >
        Contact Us
      </button>
    </header>
  );
}
