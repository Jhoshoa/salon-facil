'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/** Floating "back to top" button, mobile/tablet only (same `lg:` cutoff the search bar's own
 * sticky behavior uses -- below that, the bar isn't sticky because it ate too much of a small
 * screen), so this is how a user who scrolled past it gets back without swiping all the way up
 * by hand. Appears once they've scrolled about one screen down, and always scrolls to the very
 * top (the search bar lives right there) rather than to the bar itself, matching the "take me
 * back to the start" pattern people already know from other apps. */
export const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > window.innerHeight);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90 lg:hidden"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};
