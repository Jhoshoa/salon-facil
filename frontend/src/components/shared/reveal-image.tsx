'use client';

import Image, { ImageProps } from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface RevealImageProps extends Omit<ImageProps, 'priority' | 'loading'> {
  /** Classes for the sized, positioned box that owns the IntersectionObserver -- this is what
   * `fill` positions against, so it needs to carry whatever `relative h-[...]` the call site
   * used to give the plain `<Image fill>` before this wrapper existed. */
  wrapperClassName: string;
}

/**
 * Wraps next/image with our own IntersectionObserver instead of the browser's native
 * `loading="lazy"` heuristic, which is an unspecified per-browser distance threshold and not
 * something we control. This renders nothing until the wrapper box comes within `rootMargin`
 * of the viewport, then mounts the real `<Image loading="eager">` so it starts fetching
 * immediately on reveal.
 *
 * Deliberately `loading="eager"`, not `priority`: `priority` sets `fetchpriority="high"`, and
 * with a 600px rootMargin a normal scroll can bring 2-3 grid images into range at once -- if
 * all of them fetched at high priority simultaneously they'd compete for bandwidth/connections
 * the same way stacking `priority` on multiple hero images does (see the hero section in
 * page.tsx, which now only gives it to the single true LCP image). Plain `eager` still skips
 * the native lazy gate -- our observer already did that job -- without that contention.
 */
export const RevealImage = ({ wrapperClassName, ...imageProps }: RevealImageProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={wrapperClassName}>
      {visible ? <Image {...imageProps} loading="eager" /> : null}
    </div>
  );
};
