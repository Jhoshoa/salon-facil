'use client';

import { useEffect, useRef, useState } from 'react';

export interface LegendCarouselItem {
  label: string;
  colorClass: string;
}

interface LegendCarouselProps {
  items: LegendCarouselItem[];
  /** How many items are shown at once. */
  visibleCount?: number;
  /** Ms between rotations. */
  intervalMs?: number;
}

/**
 * Auto-rotating strip of city/department legend items — shows `visibleCount` at a
 * time and slides the window forward by one every `intervalMs`, wrapping around.
 * Pauses on hover/focus, and skips the rotation (and the fade-in) entirely under
 * prefers-reduced-motion, showing a static page instead.
 */
export const LegendCarousel = ({ items, visibleCount = 4, intervalMs = 3800 }: LegendCarouselProps) => {
  const [start, setStart] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const pausedRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(query.matches);
    const onChange = () => setReduceMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || items.length <= visibleCount) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      setStart((s) => (s + 1) % items.length);
      setFadeKey((k) => k + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [items.length, visibleCount, intervalMs, reduceMotion]);

  const visible = reduceMotion
    ? items
    : Array.from({ length: Math.min(visibleCount, items.length) }, (_, i) => items[(start + i) % items.length]);

  return (
    <div
      className="flex flex-wrap justify-center gap-6 sm:gap-9"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {visible.map((item) => (
        <div
          key={reduceMotion ? item.label : `${fadeKey}-${item.label}`}
          className={`flex items-center gap-2.5 text-sm text-foreground ${reduceMotion ? '' : 'sf-legend-fade'}`}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
};
