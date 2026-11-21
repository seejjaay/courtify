import { cn } from '@/lib/utils';
import { COURT_SPECS, type SportSlug } from './court-specs';

type CourtDiagramProps = {
  sport: SportSlug;
  /** Multiplier on the default line weight (which scales with the court's size). */
  strokeWidth?: number;
  className?: string;
};

/** Top-down chalk-on-clay court. Lines are drawn in metres, so every sport keeps true proportions. */
export function CourtDiagram({ sport, strokeWidth = 1, className }: CourtDiagramProps) {
  const { label, width, length, netY, lines } = COURT_SPECS[sport];
  const size = Math.max(width, length);
  const pad = size * 0.06;
  const stroke = size * 0.008 * strokeWidth;

  return (
    <svg
      role="img"
      aria-label={`${label} court diagram`}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${length + pad * 2}`}
      className={cn('text-chalk', className)}
    >
      <rect x={0} y={0} width={width} height={length} className="fill-clay" />
      <g stroke="currentColor" strokeWidth={stroke} strokeLinecap="square" fill="none">
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      {netY !== null && (
        <line
          x1={-pad * 0.4}
          y1={netY}
          x2={width + pad * 0.4}
          y2={netY}
          className="stroke-ink/70"
          strokeWidth={stroke * 1.4}
          strokeDasharray={`${stroke * 2} ${stroke * 1.5}`}
        />
      )}
    </svg>
  );
}
