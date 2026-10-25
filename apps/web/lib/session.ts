import { cookies } from "next/headers";

export const SESSION_COOKIE = "zw_session";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

/**
 * The Railway token never reaches client JavaScript: the BFF stores it in an
 * httpOnly cookie and proxies authenticated calls server-side.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: THIRTY_DAYS_SECONDS,
};

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
}
