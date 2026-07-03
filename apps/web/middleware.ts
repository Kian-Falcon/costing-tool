import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kf_session";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/rates/:path*", "/vendors/:path*", "/training/:path*", "/models/:path*", "/exports/:path*", "/ai-logs/:path*"]
};
