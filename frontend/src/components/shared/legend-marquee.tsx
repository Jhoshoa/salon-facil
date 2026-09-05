export interface LegendMarqueeItem {
  label: string;
  colorClass: string;
}

interface LegendMarqueeProps {
  items: LegendMarqueeItem[];
}

/**
 * Continuous right-to-left ticker of city/department legend items — how many are
 * visible at once falls out naturally from the container's width, no per-breakpoint
 * item count needed. The item list is rendered twice back to back and the track
 * animates from translateX(0) to translateX(-50%), i.e. exactly the width of one
 * copy, so the loop seams perfectly (see .sf-legend-track / @keyframes
 * sf-legend-scroll in globals.css). No JS: this is a plain server component, the
 * whole thing is one CSS animation — pauses on hover and respects
 * prefers-reduced-motion via CSS alone, no state/timers involved.
 */
export const LegendMarquee = ({ items }: LegendMarqueeProps) => {
  const track = [...items, ...items];

  return (
    <div className="sf-legend-marquee">
      <div className="sf-legend-track">
        {track.map((item, index) => (
          <div key={`${item.label}-${index}`} className="sf-legend-item">
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};
