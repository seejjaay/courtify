'use client';

import { useEffect } from 'react';

/**
 * Starts the below-the-fold motion once the page has loaded and the browser is idle, so GSAP
 * never competes with the first paint. Under reduced motion it never loads at all: every
 * section is already in its finished state in the HTML.
 */
export function MotionBoot() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    // Each module is fetched and evaluated in its own task, so a slow phone never gets one long block.
    const start = async () => {
      await import('gsap');
      await yieldToBrowser();
      await import('gsap/ScrollTrigger');
      await yieldToBrowser();
      const scenes = await import('./scenes');
      await yieldToBrowser();
      if (!cancelled) cleanup = scenes.startScenes();
    };
    const whenIdle = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => void start(), { timeout: 2000 });
      else setTimeout(() => void start(), 1);
    };

    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', whenIdle);
      cleanup?.();
    };
  }, []);

  return null;
}
