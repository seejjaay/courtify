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
    const start = () => {
      void import('./scenes').then((scenes) => {
        if (!cancelled) cleanup = scenes.startScenes();
      });
    };
    const whenIdle = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 2000 });
      else setTimeout(start, 1);
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
