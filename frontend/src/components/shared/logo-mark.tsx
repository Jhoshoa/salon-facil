interface LogoMarkProps {
  className?: string;
  /** 'dark' (default): white circle outline, for the navy header bar and the navy .sf-logo
   * badge used on auth/dashboard/admin pages. 'light': ink-colored outline, for the paper-
   * colored footer background, where a white stroke would be invisible. */
  variant?: 'dark' | 'light';
}

// The brand mark (circle + four-point star) — single source of truth so every place that shows
// the logo (header, auth pages, dashboard/admin shells, footer) stays visually identical aside
// from the one thing that has to adapt: the circle's stroke color, since it needs to read
// against both a navy surface and the paper-colored footer. The star is always the same gold.
export const LogoMark = ({ className = 'h-full w-full', variant = 'dark' }: LogoMarkProps) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <circle
      cx="16"
      cy="16"
      r="14.5"
      stroke={variant === 'dark' ? '#FFFFFF' : 'hsl(var(--foreground))'}
      strokeWidth="1"
      opacity={variant === 'dark' ? '.7' : '.5'}
    />
    <path d="M16 6 L18.4 14 L26 16 L18.4 18 L16 26 L13.6 18 L6 16 L13.6 14 Z" fill="#C9A227" />
  </svg>
);
