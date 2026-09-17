'use client';

import { useEffect, useRef } from 'react';

/**
 * Attach the returned ref to a sentinel element at the end of a list -- fires `onIntersect`
 * once each time that element scrolls into view (with a little lead room via `rootMargin`, so
 * the next page starts loading before the user actually hits the bottom). `onIntersect` is read
 * through a ref so the observer isn't torn down and recreated on every render; only toggling
 * `enabled` (e.g. when there's no next page left) does that.
 */
export const useInfiniteScrollSentinel = (onIntersect: () => void, enabled: boolean) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersectRef.current();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
};
