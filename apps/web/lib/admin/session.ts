import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_SESSION_COOKIE = "zw_admin";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = {
  exp: number;
};

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function adminSessionConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32,
  );
}

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function encodeSession(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");

  return `${payload}.${signature(payload)}`;
}

function decodeSession(value: string): AdminSession | null {
  const [payload, givenSignature] = value.split(".");

  if (!payload || !givenSignature) {
    return null;
  }

  const expected = Buffer.from(signature(payload));
  const given = Buffer.from(givenSignature);

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AdminSession;

    if (
      typeof session.exp !== "number" ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const value = store.get(ADMIN_SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  try {
    return decodeSession(value);
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function createAdminSession(): Promise<void> {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;

  store.set(ADMIN_SESSION_COOKIE, encodeSession({ exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
