'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { COURT_SPECS, type SportSlug } from '@/components/brand/court-specs';
import { cn } from '@/lib/utils';
import { applyGeometry, courtGeometry, VIEW_H, VIEW_W } from './court-geometry';

// The catalog's order (and the spec's), not COURT_SPECS's key order.
const SPORTS: SportSlug[] = ['pickleball', 'badminton', 'tennis', 'padel', 'table-tennis', 'squash'];

const BLURBS: Record<SportSlug, string> = {
  pickleball: 'A 6.1 × 13.4 m court with a kitchen by the net. Quick to learn, usually doubles.',
  badminton: 'Indoor courts, 6.1 × 13.4 m. Singles or doubles, shuttles flying under the lights.',
  tennis: 'Hard and clay courts, 10.97 × 23.77 m. Morning sets or night games under floodlights.',
  padel: 'Walled courts, 10 × 20 m, always played in doubles off the glass.',
  'table-tennis': 'Tables in halls and clubs, 2.74 × 1.525 m. Fast points, no weather to worry about.',
  squash: 'Four walls, 9.75 × 6.4 m. Fast rallies off the front wall.',
};

// React draws the first court once; later switches change the SVG directly (GSAP tweens it once
// loaded), so re-renders never fight the animation.
const FIRST: SportSlug = 'pickleball';
const first = courtGeometry(FIRST);

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Six sports, one court that re-draws itself between them. Tabs pick a sport; it can cycle on its own until touched. */
export function SportsSwitcher() {
  const [active, setActive] = useState<SportSlug>(FIRST);
  const svgRef = useRef<SVGSVGElement>(null);
  const shown = useRef<SportSlug>(FIRST);
  const touched = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const show = useCallback((next: SportSlug) => {
    setActive(next);
    const svg = svgRef.current;
    const from = shown.current;
    shown.current = next;
    if (!svg || from === next) return;
    if (prefersReducedMotion()) {
      applyGeometry(svg, next);
      return;
    }
    import('./motion/scenes').then(({ morphCourt }) => morphCourt(svg, next)).catch(() => applyGeometry(svg, next));
  }, []);

  const choose = (sport: SportSlug, focus = false) => {
    touched.current = true;
    show(sport);
    if (focus) tabRefs.current[SPORTS.indexOf(sport)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = SPORTS.length - 1;
    const target =
      event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    choose(SPORTS[target]!, true);
  };

  // Cycles every 4 s while on screen and the tab is visible; stops for good once the visitor chooses.
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined' || !svgRef.current) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => (visible = !!entry?.isIntersecting), { threshold: 0.4 });
    observer.observe(svgRef.current);
    const timer = setInterval(() => {
      if (!visible || document.hidden || touched.current) return;
      show(SPORTS[(SPORTS.indexOf(shown.current) + 1) % SPORTS.length]!);
    }, 4000);
    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, [show]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-16">
      <div className="flex min-w-0 flex-col gap-6">
        <div role="tablist" aria-label="Sports" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:items-start md:overflow-visible md:px-0">
          {SPORTS.map((sport, i) => (
            <button
              key={sport}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`sport-tab-${sport}`}
              type="button"
              role="tab"
              aria-selected={active === sport}
              aria-controls="sport-panel"
              tabIndex={active === sport ? 0 : -1}
              onClick={() => choose(sport)}
              onKeyDown={(event) => onKeyDown(event, i)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-left font-display text-xl whitespace-nowrap text-ink transition-colors md:px-0 md:py-1 md:text-[clamp(1.75rem,3vw,2.5rem)]',
                active === sport ? 'bg-ink text-chalk md:bg-transparent md:text-ink' : 'bg-chalk md:bg-transparent md:text-ink/45 md:hover:text-ink',
              )}
            >
              {COURT_SPECS[sport].label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id="sport-panel" aria-labelledby={`sport-tab-${active}`} tabIndex={0} className="flex flex-col items-center gap-5 md:items-start">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`${COURT_SPECS[active].label} court`}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-[min(60svh,26rem)] w-auto rotate-[-8deg] md:h-120"
        >
          <rect data-court-rect x={first.rect.x} y={first.rect.y} width={first.rect.width} height={first.rect.height} rx={1} fill="var(--color-clay)" />
          <g stroke="var(--color-chalk)" strokeWidth={1.1} strokeLinecap="square">
            {first.lines.map(([x1, y1, x2, y2], i) => (
              <line key={i} data-court-line x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
          </g>
          {first.net && (
            <line
              data-court-net
              x1={first.net[0]}
              y1={first.net[1]}
              x2={first.net[2]}
              y2={first.net[3]}
              stroke="var(--color-ink)"
              strokeOpacity={0.6}
              strokeWidth={1.2}
              strokeDasharray="2.2 1.6"
            />
          )}
        </svg>
        <p className="max-w-sm text-lg text-ink">{BLURBS[active]}</p>
      </div>
    </div>
  );
}
