/** The one-shot toast handed from a server action to the next page (see setFlash and FlashToast). */
export const FLASH_COOKIE = 'courtify_flash';
export const FLASH_KINDS = ['success', 'error', 'info'] as const;
export type FlashKind = (typeof FLASH_KINDS)[number];
export type Flash = { message: string; kind: FlashKind };
