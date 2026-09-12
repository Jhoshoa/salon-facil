interface LogoMarkProps {
  className?: string;
  /** 'dark' (default): navy + gold facets with a white edge, for the navy header bar and the
   * navy .sf-logo badge — the white edge (not the fill) is what separates it from the navy
   * surface behind it. 'light': navy + gold facets with a navy edge, for the paper-colored
   * footer background. Both use the same navy/gold fill so the mark stays one consistent color. */
  variant?: 'dark' | 'light';
}

// The brand mark — a rounded "pillow cut" diamond split into 4 facets (a vertical cut plus a
// horizontal one, offset above center) so it reads as two pyramid faces catching light rather
// than a flat triangle, with a small two-tone accent at the facet junction. Single source of
// truth so every place that shows the logo (header, auth pages, dashboard/admin shells, footer)
// stays visually identical aside from the one thing that has to adapt: the edge color, since
// that's what keeps the navy facets from blending into a navy surface, not the fill itself.
export const LogoMark = ({ className = 'h-full w-full', variant = 'dark' }: LogoMarkProps) => {
  const left = 'hsl(var(--primary))';
  const right = '#C9A227';
  const edge = variant === 'dark' ? '#FFFFFF' : 'hsl(var(--primary))';
  const seam = variant === 'dark' ? '#FFFFFF' : '#F2E4B8';
  const seamOpacity = variant === 'dark' ? 0.4 : 0.45;
  const outlineOpacity = variant === 'dark' ? 0.75 : 0.5;

  return (
    <svg viewBox="0 0 52 52" fill="none" className={className}>
      <defs>
        <clipPath id="logoMarkClip">
          <rect x="10" y="10" width="32" height="32" rx="8" transform="rotate(45 26 26)" />
        </clipPath>
      </defs>
      <g clipPath="url(#logoMarkClip)" stroke={seam} strokeOpacity={seamOpacity} strokeWidth="0.5">
        <polygon points="26,4 4,26 26,20" fill={left} />
        <polygon points="4,26 26,48 26,20" fill={left} />
        <polygon points="26,4 48,26 26,20" fill={right} />
        <polygon points="48,26 26,48 26,20" fill={right} />
      </g>
      <rect
        x="10"
        y="10"
        width="32"
        height="32"
        rx="8"
        transform="rotate(45 26 26)"
        fill="none"
        stroke={edge}
        strokeOpacity={outlineOpacity}
        strokeWidth="0.6"
      />
      <circle cx="26" cy="20" r="3" fill={right} stroke={edge} strokeWidth="0.8" />
    </svg>
  );
};
