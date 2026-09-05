'use client';

import { ReactNode, useState } from 'react';

interface PinnedPrintProps {
  /** Position/size/rotation utilities — kept on the caller since every print in the
   * hero corkboard sits at a different spot. */
  className: string;
  children: ReactNode;
}

/**
 * A ".sf-print" polaroid pinned to the wall (see .sf-print / .sf-print-pin in
 * globals.css). On desktop hover it sways like it was just nudged, pivoting from
 * the pin at its top edge — same "is-swaying" mechanism as the search bar
 * (sf-journal-bar): the class is added on mouseenter and only removed on
 * animationend, so the sequence always finishes even if the pointer leaves
 * right away, instead of snapping back mid-swing.
 */
export const PinnedPrint = ({ className, children }: PinnedPrintProps) => {
  const [isSwaying, setIsSwaying] = useState(false);

  return (
    <div
      className={`sf-print ${className} ${isSwaying ? 'is-swaying' : ''}`}
      onMouseEnter={() => setIsSwaying(true)}
      onAnimationEnd={() => setIsSwaying(false)}
    >
      {children}
    </div>
  );
};
