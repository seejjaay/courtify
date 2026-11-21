'use client';

import { Lock } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SidebarItem = {
  href: string;
  label: string;
  /** A rendered icon element (server components can't pass component functions to the client). */
  icon: ReactNode;
  locked?: boolean;
  badge?: number;
  /** Defaults to "the URL is exactly href". */
  current?: boolean;
};
export type SidebarGroup = { title: string; items: SidebarItem[] };

/**
 * Section navigation for the owner and admin shells. A vertical sidebar from md up; on phones the
 * same nav becomes one scrollable row of chips under the header. It lives in a layout, so it stays
 * mounted while the content beside it changes.
 */
export function AppSidebar({ label, shell, header, groups }: { label: string; shell: 'owner' | 'admin'; header?: ReactNode; groups: SidebarGroup[] }) {
  const pathname = usePathname();
  return (
    <div data-shell={shell} className="flex flex-col gap-3 border-b-2 border-chalk px-4 py-3 md:w-64 md:shrink-0 md:gap-6 md:border-r-2 md:border-b-0 md:px-3 md:py-6">
      {header}
      <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <div className="flex gap-1 md:flex-col md:gap-5">
          {groups.map((group) => (
            <div key={group.title} className="flex gap-1 md:flex-col">
              <p className="hidden px-3 text-xs font-medium tracking-wide text-ink-soft uppercase md:block">{group.title}</p>
              <ul className="flex gap-1 md:flex-col">
                {group.items.map((item) => {
                  const current = item.current ?? pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        aria-current={current ? 'page' : undefined}
                        className={cn(
                          'flex h-10 items-center gap-2.5 rounded-full px-3 text-sm whitespace-nowrap text-ink transition-colors hover:bg-chalk md:rounded-lg',
                          current && 'bg-chalk font-medium shadow-[inset_3px_0_0_var(--color-clay)]',
                        )}
                      >
                        <span className="text-ink-soft [&_svg]:size-4">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.locked && (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-taupe px-1.5 py-0.5 text-[0.7rem] font-medium text-ink-soft">
                            <Lock aria-hidden="true" className="size-3" />
                            Pro
                          </span>
                        )}
                        {item.badge ? (
                          <span className="ml-auto rounded-full bg-clay px-2 py-0.5 text-xs font-semibold text-ink tabular-nums">
                            {item.badge}
                            <span className="sr-only"> waiting</span>
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
