import { NextResponse, type NextRequest } from 'next/server';
import { canOpenOwnerSection } from '@/features/owner/access';
import { updateSession } from '@/lib/supabase/proxy';

const PROTECTED_PREFIXES = ['/me', '/book', '/owner', '/admin'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Renders the styled not-found page with a real 404 status, keeping any refreshed cookies. */
function notFound(request: NextRequest, response: NextResponse): NextResponse {
  // No route matches this path, so Next answers with the root not-found page and status 404.
  const rewrite = NextResponse.rewrite(new URL('/__not-found', request.url));
  for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie);
  return rewrite;
}

/**
 * Refreshes the session cookies on every page request and settles access to the gated areas
 * before rendering starts. Under Cache Components the response status is fixed once the
 * prerendered shell is sent, so a 404 must be decided here (Next's documented approach).
 * Layouts and server actions still verify access again on the server.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, supabase } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId) {
    if (!PROTECTED_PREFIXES.some((prefix) => under(pathname, prefix))) return response;
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(login);
    // Keep whatever the refresh did to the cookies (e.g. clearing an expired session).
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  // Admin pages don't advertise themselves: anyone else gets a 404.
  if (under(pathname, '/admin')) {
    const { data: isAdmin } = await supabase.rpc('is_platform_admin');
    if (isAdmin !== true) return notFound(request, response);
  }

  // A venue dashboard needs membership, and each section its minimum role.
  const [, venueId, section] = pathname.match(/^\/owner\/([^/]+)(?:\/([^/]+))?/) ?? [];
  if (venueId && UUID.test(venueId)) {
    const { data: role } = await supabase.rpc('venue_role', { p_venue_id: venueId });
    if (!role || (section && !canOpenOwnerSection(role, section))) return notFound(request, response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)'],
};
