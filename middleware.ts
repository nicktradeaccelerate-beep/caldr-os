import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/onboard'];
const OPERATOR_PREFIXES = ['/calls', '/tasks', '/ai', '/brief', '/boss', '/code', '/time', '/master', '/admin', '/platform'];

function routeForRole(role: string, req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;

  switch (role) {
    case 'apprentice': {
      // Block operator routes for apprentices
      const isOperatorRoute = OPERATOR_PREFIXES.some(p => path.startsWith(p));
      if (isOperatorRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      // Redirect root to apprentice dashboard
      if (path === '/') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return null;
    }

    case 'operator':
    case 'owner':
    case 'manager':
    case 'va': {
      // Apprentice-only routes — operators redirect to home
      const APPRENTICE_ONLY = ['/dashboard', '/guide', '/portfolio'];
      if (APPRENTICE_ONLY.some(p => path === p || path.startsWith(p + '/'))) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      // Owner/operator-only: master + admin
      if (path.startsWith('/master') && !['owner', 'manager', 'operator'].includes(role)) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      if (path.startsWith('/admin') && !['owner', 'operator'].includes(role)) {
        return NextResponse.redirect(new URL('/', req.url));
      }
      return null;
    }

    default:
      return NextResponse.redirect(new URL('/login', req.url));
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p));
  const isApiOrAsset = path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/icons');
  if (isApiOrAsset) return res;

  // Demo mode — no Supabase credentials set, allow everything through
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { res.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { res.cookies.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Unauthenticated → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && !isPublic) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = (user as { role?: string } | null)?.role ?? 'va';
    const redirect = routeForRole(role, req);
    if (redirect) return redirect;
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
