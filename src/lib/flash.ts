import 'server-only';
import { cookies } from 'next/headers';
import { FLASH_COOKIE, type Flash, type FlashKind } from './flash-shared';

/**
 * Queues a toast for the page a mutation redirects to. Readable by the client (not httpOnly)
 * because FlashToast reads and clears it; it only ever carries a message we wrote.
 */
export async function setFlash(message: string, kind: FlashKind = 'success'): Promise<void> {
  const flash: Flash = { message, kind };
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), { maxAge: 60, path: '/', httpOnly: false, sameSite: 'lax' });
}
