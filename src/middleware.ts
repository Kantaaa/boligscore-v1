import { NextResponse, type NextRequest } from "next/server";

import { safeNextParam } from "@/lib/auth/redirects";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

/**
 * Match every path EXCEPT Next internals, the manifest, sw.js, the icons
 * directory, and api routes that must remain public. We re-check the
 * "is /app/*" predicate inside the handler to keep the matcher simple.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|workbox-.*|icons/.*|api/.*).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Public paths — never gate.
  const isPublic =
    pathname === "/" ||
    pathname === "/registrer" ||
    pathname === "/logg-inn" ||
    pathname.startsWith("/invitasjon/") ||
    pathname.startsWith("/dev/login");

  // Anything outside /app/* (and not the public list above) we let pass —
  // the matcher already excluded asset and api paths.
  const isProtected = pathname === "/app" || pathname.startsWith("/app/");

  if (!isProtected || isPublic) {
    // We still want auth cookies to refresh on regular requests so the
    // session stays alive, but we don't redirect.
    const { response } = createSupabaseMiddlewareClient(request);
    return response;
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  // Build the login redirect with a sanitised next= param.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/logg-inn";
  loginUrl.search = "";
  const candidate = `${pathname}${search}`;
  const safeNext = safeNextParam(candidate);
  if (safeNext) {
    loginUrl.searchParams.set("next", safeNext);
  }

  return NextResponse.redirect(loginUrl);
}
