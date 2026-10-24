/**
 * Kept in its own module so client components can build API URLs without
 * pulling in the server-side fetchers (and their mock catalogue).
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
