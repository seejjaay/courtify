'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useActionState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/features/auth/actions';
import { initialFormState } from '@/features/auth/schemas';

export type UserMenuViewer = { fullName: string; email: string | null; isAdmin: boolean; hasVenues: boolean };

function initials(name: string, email: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (email?.[0] ?? '?').toUpperCase();
}

/** One account can wear several hats: the menu offers the venue dashboard and admin when they apply. */
export function UserMenu({ viewer }: { viewer: UserMenuViewer }) {
  const [, signOutAction, signingOut] = useActionState(signOut, initialFormState);
  const links: { href: string; label: string }[] = [
    { href: '/me/bookings', label: 'My bookings' },
    { href: '/me/favorites', label: 'Saved' },
    { href: '/me/profile', label: 'Profile' },
    viewer.hasVenues ? { href: '/owner', label: 'Venue dashboard' } : { href: '/owner/new', label: 'List your venue' },
    ...(viewer.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-10 items-center justify-center rounded-full bg-sand text-sm font-semibold text-ink"
      >
        {initials(viewer.fullName, viewer.email)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-ink">{viewer.fullName || 'Your account'}</span>
          {viewer.email && <span className="truncate text-xs font-normal text-ink-soft">{viewer.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href as Route}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" disabled={signingOut} className="w-full">
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
