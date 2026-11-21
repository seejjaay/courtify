const BASE = 'http://courtify.invalid';

/**
 * A `next` redirect target that can only point inside this site. Anything that would leave the
 * origin — protocol-relative (//x), backslash tricks (/\x), absolute or scheme URLs, or control
 * characters that parsers strip — falls back.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
