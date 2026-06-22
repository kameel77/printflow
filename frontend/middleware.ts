import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware to proxy /api/* requests to the backend.
 *
 * Why middleware instead of next.config.js rewrites?
 * - next.config.js rewrites are baked at BUILD TIME (process.env is inlined)
 * - In Coolify docker-compose, multiple environments share the 'coolify' network
 * - Docker DNS resolves 'backend' to ANY container with that service name
 * - This causes cross-environment data leaks (staging frontend → main backend)
 * - Middleware runs at RUNTIME, so it reads the actual BACKEND_URL env var
 *   from the container's environment, not the build-time value
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only proxy /api/* requests
  if (pathname.startsWith("/api/")) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const url = new URL(pathname + request.nextUrl.search, backendUrl);

    return NextResponse.rewrite(url, {
      request: {
        headers: request.headers,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
