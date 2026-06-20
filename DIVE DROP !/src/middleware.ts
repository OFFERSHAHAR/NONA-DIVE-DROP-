import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Pages that require authentication
const PROTECTED_ROUTES = [
  '/find-buddy',
  '/bookings',
  '/my-dives',
  '/my-profile',
  '/settings',
  '/free-diving/my-trainings',
  '/equipment/rentals',
];

// Admin routes
const ADMIN_ROUTES = ['/admin'];

// Public routes (no auth required)
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get locale from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'en';

  // Extract path without locale
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/';

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathWithoutLocale.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    pathWithoutLocale.startsWith(route)
  );

  // If not a protected route, apply i18n middleware and continue
  if (!isProtectedRoute && !isAdminRoute) {
    return intlMiddleware(request);
  }

  // Create Supabase client to check authentication
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getSetCookie(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated - redirect to login
  if (!user) {
    const loginUrl = new URL(`/${locale}/unauthorized`, request.url);
    loginUrl.searchParams.set('redirect', pathWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access
  if (isAdminRoute) {
    const isAdmin = user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      const forbiddenUrl = new URL(`/${locale}/forbidden`, request.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  // User is authenticated, apply i18n middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Skip internal paths
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
