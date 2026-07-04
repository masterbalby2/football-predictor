import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js static assets and internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) {
    return NextResponse.next();
  }

  // Redirect to login for page requests, 401 for API requests
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match all paths except Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
