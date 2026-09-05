'use client';

import { CSSProperties, ReactNode, useState } from 'react';

interface PinnedPrintProps {
  /** Position/size utilities — kept on the caller since every print in the hero
   * corkboard sits at a different spot. Rotation is NOT included here (see `rotate`
   * below) — it has to reach the element as the --sway-rotate custom property, not
   * as a Tailwind rotate-* utility, so the sway animation can oscillate around the
   * print's real resting tilt instead of overriding it. */
  className: string;
  /** The print's resting tilt, e.g. "-4deg". Read by .sf-print in globals.css both
   * for the static (non-hovering) transform and as the sway keyframes' 0%/100%
   * baseline — that's what lets the hover animation swing around this angle
   * instead of snapping to upright at the start and snapping back at the end. */
  rotate: string;
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
export const PinnedPrint = ({ className, rotate, children }: PinnedPrintProps) => {
  const [isSwaying, setIsSwaying] = useState(false);

  return (
    <div
      className={`sf-print ${className} ${isSwaying ? 'is-swaying' : ''}`}
      style={{ '--sway-rotate': rotate } as CSSProperties}
      onMouseEnter={() => setIsSwaying(true)}
      onAnimationEnd={() => setIsSwaying(false)}
    >
      {children}
    </div>
  );
};
