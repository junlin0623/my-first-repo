import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSession } from './lib/session';

// With APP_PASSWORD set, everything except the login page needs the session cookie.
// Without it there is no login (local use; the dev server only listens on this Mac).
export async function proxy(req: NextRequest) {
  if (!process.env.APP_PASSWORD) return NextResponse.next();
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
