import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Sesión propia (no Supabase Auth): una cookie firmada con el id del
// barbero logueado. Ver CLAUDE.md / schema.sql sección 1.1 para el porqué.
export const SESSION_COOKIE = "bp_session";
const SESSION_DURATION = "30d";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno SESSION_SECRET");
  }
  return new TextEncoder().encode(secret);
}

interface SessionPayload extends JWTPayload {
  barberId: string;
}

export async function createSessionCookie(barberId: string) {
  const token = await new SignJWT({ barberId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Reusable tanto acá (Server Components/Actions, vía next/headers) como en
// proxy.ts (que lee la cookie directo del NextRequest, sin next/headers).
export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey());
    return payload.barberId ?? null;
  } catch {
    return null;
  }
}

export async function getSessionBarberId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}
