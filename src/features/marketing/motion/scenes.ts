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
