// Loaded only through MotionBoot's dynamic import, after LCP. Never import this statically.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SportSlug } from '@/components/brand/court-specs';
import { courtGeometry } from '../court-geometry';

/** Re-draws a court SVG (see SportsSwitcher) as another sport, line by line. */
export function morphCourt(svg: SVGSVGElement, to: SportSlug): void {
  const g = courtGeometry(to);
  const ease = 'power3.inOut';
  gsap.to(svg.querySelector('[data-court-rect]'), { attr: g.rect, duration: 0.7, ease });
  svg.querySelectorAll('[data-court-line]').forEach((line, i) => {
    const [x1, y1, x2, y2] = g.lines[i]!;
    gsap.to(line, { attr: { x1, y1, x2, y2 }, duration: 0.7, ease, delay: i * 0.015 });
  });
  const net = svg.querySelector('[data-court-net]');
  if (net) {
    gsap.to(net, {
      attr: g.net ? { x1: g.net[0], y1: g.net[1], x2: g.net[2], y2: g.net[3] } : {},
      opacity: g.net ? 1 : 0,
      duration: 0.5,
      ease,
    });
  }
}

/** A scene animates one `[data-scene]` section. `fromBelow` is false when the section was already on screen at boot. */
type Scene = (section: HTMLElement, fromBelow: boolean) => void;

const SCENES: Record<string, Scene> = {};

/** Registers a scene by its `data-scene` name. Later tasks add serve, daylight, dashboard and cta-roll. */
export function defineScene(name: string, scene: Scene): void {
  SCENES[name] = scene;
}

// How it works: scrubbing through the section bounces the ball across the three steps, left to
// right from md up and top to bottom on phones. Its shadow stays on the ground and shrinks in the air.
defineScene('serve', (section, fromBelow) => {
  const row = section.querySelector<HTMLElement>('[data-serve-row]');
  const ball = section.querySelector('[data-serve-ball]');
  const shadow = section.querySelector('[data-serve-shadow]');
  if (!row || !ball || !shadow || !fromBelow) return;

  const mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767.98px)' }, (ctx) => {
    const wide = !!ctx.conditions?.wide;
    const span = () => (wide ? row.clientWidth : row.clientHeight) - 16;
    const along = wide ? 'x' : 'y';
    const lift = wide ? 'y' : 'x';
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: row, start: 'top 75%', end: 'bottom 45%', scrub: 0.6, invalidateOnRefresh: true },
    });
    for (let hop = 1; hop <= 4; hop++) {
      const up = hop % 2 === 1;
      timeline.to(ball, { [along]: () => (span() * hop) / 4, [lift]: up ? (wide ? -64 : 40) : 0, ease: up ? 'power1.out' : 'power1.in', duration: 1 }, hop - 1);
      timeline.to(shadow, { [along]: () => (span() * hop) / 4, scale: up ? 0.55 : 1, opacity: up ? 0.5 : 1, duration: 1 }, hop - 1);
    }
  });
});

/**
 * Sets up every scene on the page and returns a cleanup. Sections are finished in the HTML;
 * a scene only sets "from" states for sections that are still below the viewport, so nothing
 * on screen ever jumps back to a start state.
 */
export function startScenes(): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const context = gsap.context(() => {
    for (const section of document.querySelectorAll<HTMLElement>('[data-scene]')) {
      const scene = SCENES[section.dataset.scene ?? ''];
      if (scene) scene(section, section.getBoundingClientRect().top > window.innerHeight);
    }
  });
  return () => context.revert();
}
