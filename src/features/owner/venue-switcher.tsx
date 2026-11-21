'use client';

import { ChevronsUpDown } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type VenueOption = { id: string; name: string; hasPro: boolean };

export function VenueSwitcher({ current, venues }: { current: VenueOption; venues: VenueOption[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-greige bg-chalk px-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{current.name}</span>
          <span className="text-xs text-ink-soft">{current.hasPro ? 'Pro' : 'Free plan'}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-ink-soft" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your venues</DropdownMenuLabel>
        {venues.map((venue) => (
          <DropdownMenuItem key={venue.id} asChild>
            <Link href={`/owner/${venue.id}/today` as Route} aria-current={venue.id === current.id ? 'page' : undefined}>
              {venue.name}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/owner/new">List another venue</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
