import { COURT_SPECS, type SportSlug } from '@/components/brand/court-specs';

/**
 * Every sport scaled into one shared 100 × 200 viewBox, so any court can morph into any other:
 * a 2.74 m table and a 23.77 m tennis court become the same size on screen. Each sport has the
 * same 16 lines (unused ones are zero-length at the centre), which is what makes line-by-line
 * tweening possible.
 */
export const VIEW_W = 100;
export const VIEW_H = 200;
const BOX_W = 78;
const BOX_H = 176;

export type CourtGeometry = {
  rect: { x: number; y: number; width: number; height: number };
  lines: [number, number, number, number][];
  net: [number, number, number, number] | null;
};

export function courtGeometry(sport: SportSlug): CourtGeometry {
  const spec = COURT_SPECS[sport];
  const scale = Math.min(BOX_W / spec.width, BOX_H / spec.length);
  const ox = (VIEW_W - spec.width * scale) / 2;
  const oy = (VIEW_H - spec.length * scale) / 2;
  const px = (x: number) => +(ox + x * scale).toFixed(2);
  const py = (y: number) => +(oy + y * scale).toFixed(2);
  return {
    rect: { x: px(0), y: py(0), width: +(spec.width * scale).toFixed(2), height: +(spec.length * scale).toFixed(2) },
    lines: spec.lines.map(([x1, y1, x2, y2]) => [px(x1), py(y1), px(x2), py(y2)]),
    net: spec.netY === null ? null : [px(-0.4), py(spec.netY), px(spec.width + 0.4), py(spec.netY)],
  };
}

/** Sets a court SVG to a sport at once, with no animation (reduced motion, or before GSAP loads). */
export function applyGeometry(svg: SVGSVGElement, sport: SportSlug): void {
  const g = courtGeometry(sport);
  const rect = svg.querySelector('[data-court-rect]');
  if (rect) for (const [key, value] of Object.entries(g.rect)) rect.setAttribute(key, String(value));
  svg.querySelectorAll('[data-court-line]').forEach((line, i) => {
    const [x1, y1, x2, y2] = g.lines[i]!;
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
  });
  const net = svg.querySelector<SVGLineElement>('[data-court-net]');
  if (net) {
    if (g.net) {
      const [x1, y1, x2, y2] = g.net;
      net.setAttribute('x1', String(x1));
      net.setAttribute('y1', String(y1));
      net.setAttribute('x2', String(x2));
      net.setAttribute('y2', String(y2));
    }
    net.style.opacity = g.net ? '1' : '0';
  }
}
