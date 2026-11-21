'use client';

import dynamic from 'next/dynamic';

/**
 * The account menu, split into its own chunk. A static import from the header would put the Radix
 * menu primitives (~70 KB gzipped) in every page's initial JS, even for visitors who aren't signed
 * in and never see the menu.
 */
export const UserMenuLazy = dynamic(() => import('./user-menu').then((m) => m.UserMenu));
