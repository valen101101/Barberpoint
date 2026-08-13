import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

// Verifica la cookie de sesión propia (no Supabase Auth — ver
// src/lib/session.ts) y redirige a /login si no hay una válida. Se invoca
// desde proxy.ts (ver docs de Next.js 16: el archivo "middleware.ts" fue
// renombrado a "proxy.ts").
export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const barberId = await verifySessionToken(token);

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!barberId && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (barberId && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next({ request });
}
