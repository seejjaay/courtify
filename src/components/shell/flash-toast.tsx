'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { FLASH_COOKIE, FLASH_KINDS, type Flash } from '@/lib/flash-shared';

/** Shows (once) the toast a server action left in the flash cookie before redirecting here. */
export function FlashToast() {
  const pathname = usePathname();

  useEffect(() => {
    const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${FLASH_COOKIE}=`));
    if (!entry) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    try {
      const flash = JSON.parse(decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1))) as Flash;
      if (typeof flash.message === 'string' && FLASH_KINDS.includes(flash.kind)) toast[flash.kind](flash.message);
    } catch {
      // A malformed cookie is dropped silently.
    }
  }, [pathname]);

  return null;
}
