import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/redirect';
import { createServerSupabase } from '@/lib/supabase/server';

/** Lands email links (signup confirmation, password reset): trades the code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNextPath(searchParams.get('next'), '/me/bookings'), origin));
  }

  return NextResponse.redirect(new URL('/login?error=link_expired', origin));
}
