// Loaded only through MotionBoot's dynamic import, after LCP. Never import this statically.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
