'use client';

import { Ellipsis } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { SidebarGroup } from './app-sidebar';

export type TabItem = { href: string; label: string; icon: ReactNode; emphasis?: boolean };

/** Thumb-reach bar on phones. An `emphasis` item (Check-in for venues) is raised in the middle. */
export function MobileTabBar({ label, items, more }: { label: string; items: TabItem[]; more?: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-chalk bg-stucco/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="flex items-end justify-around px-2">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href as Route}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[0.7rem] text-ink-soft [&_svg]:size-5',
                  current && 'font-semibold text-ink',
                  item.emphasis && 'text-ink',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center',
                    item.emphasis && '-mt-5 size-12 rounded-full bg-clay shadow-sun ring-4 ring-stucco',
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
        {more && <li className="flex-1">{more}</li>}
      </ul>
    </nav>
  );
}

/** The "More" tab: every section in a bottom sheet. */
export function MoreSheet({ groups }: { groups: SidebarGroup[] }) {
  return (
    <Sheet>
      <SheetTrigger className="flex w-full flex-col items-center gap-0.5 py-2 text-[0.7rem] text-ink-soft [&_svg]:size-5">
        <Ellipsis aria-hidden="true" />
        More
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>All sections</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">{group.title}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href as Route} className="flex h-11 items-center gap-3 rounded-lg px-2 text-sm text-ink hover:bg-chalk [&_svg]:size-4">
                  {item.icon}
                  {item.label}
                  {item.locked && <span className="ml-auto text-xs text-ink-soft">Pro</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
