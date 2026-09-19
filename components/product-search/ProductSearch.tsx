'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { isNeutralRecolor, type Product } from '@/data/products';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useReducedMotion } from '@/hooks/useMediaQuery';
import { EASE } from '@/lib/motion/easings';
import { gsap } from '@/lib/motion/gsap';
import { filterString } from '@/lib/products/recolor';
import { searchProducts } from '@/lib/products/search';
import { useProduct } from '@/providers/ProductProvider';

import styles from './ProductSearch.module.css';

/**
 * A floating way into the range, not a search page.
 *
 * Choosing a suggestion runs the same flavour transition as a card or an arrow
 * and the page never navigates: the experience stays where it is and changes
 * around the user.
 */
export function ProductSearch() {
  const { selectProduct } = useProduct();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reducedMotion = useReducedMotion();
  const listId = useId();

  const results = useMemo(() => searchProducts(query), [query]);
  const showPanel = open && query.trim().length > 0;
  const hasResults = results.length > 0;

  /**
   * @param returnFocus Whether the caller is a keyboard interaction that must
   * leave focus somewhere sensible. Blurring unconditionally sends focus to
   * <body>, so Escape or Enter would drop the user out of the tab order at the
   * bottom of a six-section page.
   */
  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
    if (!returnFocus) inputRef.current?.blur();
  }, []);

  const choose = useCallback(
    (product: Product) => {
      selectProduct(product.id);
      close();
    },
    [selectProduct, close],
  );

  /* Global shortcut. Cmd/Ctrl+K is the expected gesture; "/" is the shorthand
     people try on content sites. Both are ignored while typing elsewhere. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      const isShortcut =
        (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !isEditable);

      if (isShortcut) {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* Dismiss on outside click, so the bar behaves like the transient control it
     looks like rather than trapping the page. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!dockRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  // Keep the highlight in range as the result set shrinks under the cursor.
  useEffect(() => {
    setHighlight((current) => (current >= results.length ? 0 : current));
  }, [results.length]);

  /* Suggestions stagger in. They animate on every change of the result set, so
     refining a query feels like the list re-forming rather than swapping. */
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !showPanel || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        list,
        { opacity: 0, y: 12, scaleY: 0.94 },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.32, ease: EASE.ui, transformOrigin: 'bottom center' },
      );
      gsap.fromTo(
        list.querySelectorAll('[data-result]'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.34, ease: EASE.ui, stagger: 0.045 },
      );
    }, list);

    return () => ctx.revert();
  }, [showPanel, results, reducedMotion]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (!hasResults) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const product = results[highlight];
      if (product) choose(product);
    }
  };

  return (
    <div className={styles.dock} ref={dockRef} data-enter="search">
      {/* The suggestion list is rendered above the input and updates without
          moving focus, so a screen reader gets no notification that anything
          happened. This announces the outcome instead. */}
      <p className="sr-only" role="status" aria-live="polite">
        {showPanel
          ? hasResults
            ? `${results.length} ${results.length === 1 ? 'flavour' : 'flavours'} found`
            : 'No flavours found'
          : ''}
      </p>

      {showPanel && (
        <ul
          className={styles.results}
          id={listId}
          role="listbox"
          aria-label="Matching flavours"
          ref={listRef}
        >
          {hasResults ? (
            results.map((product, index) => {
              const recolor = filterString(product.recolor);
              const filter = isNeutralRecolor(product.recolor)
                ? undefined
                : `drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) ${recolor}`;

              return (
                <li
                  key={product.id}
                  id={`${listId}-${index}`}
                  data-result=""
                  data-highlighted={index === highlight}
                  className={styles.result}
                  role="option"
                  aria-selected={index === highlight}
                  onPointerEnter={() => setHighlight(index)}
                  // pointerdown, not click: the dock's outside-click handler
                  // fires on pointerdown and would close before a click lands.
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(product);
                  }}
                >
                  <img
                    className={styles.resultCan}
                    src={product.cardImage}
                    alt=""
                    width={34}
                    height={34}
                    loading="lazy"
                    decoding="async"
                    style={filter ? { filter } : undefined}
                  />
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>{product.name}</span>
                    <span className={styles.resultFlavor}>{product.flavor}</span>
                  </span>
                  <span
                    className={styles.swatch}
                    style={{ background: product.world.inner }}
                    aria-hidden="true"
                  />
                  <span className={styles.resultPrice}>{product.price}</span>
                </li>
              );
            })
          ) : (
            // Not role="option": a listbox option advertises something the
            // user can select, and there is nothing here to select.
            <li className={styles.empty} role="presentation">
              No flavour called{' '}
              <span className={styles.emptyQuery}>{query.trim()}</span>
            </li>
          )}
        </ul>
      )}

      <div
        className={styles.bar}
        data-open={open}
        onPointerDown={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <svg
          className={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          value={query}
          placeholder="Find a flavour"
          autoComplete="off"
          spellCheck={false}
          aria-label="Find a flavour"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && hasResults ? `${listId}-${highlight}` : undefined
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
        />

        {query ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            // preventDefault on pointerdown keeps focus in the input on mouse
            // use; onClick is what a keyboard Enter/Space actually dispatches,
            // so both paths need covering.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('');
              setHighlight(0);
              inputRef.current?.focus();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <span className={styles.hint} aria-hidden="true">
            &#8984;K
          </span>
        )}
      </div>
    </div>
  );
}
