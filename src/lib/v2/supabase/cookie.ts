/**
 * Isolated v2 auth cookie. 1.0 uses localStorage (`sb-*-auth-token`) plus
 * `launchpad-role` / `lp_session`. This name must stay distinct so v2
 * sign-in / sign-out never writes or clears those.
 */
export const V2_AUTH_COOKIE = "lp-v2-auth";

export function isV2AuthCookie(name: string): boolean {
  return name === V2_AUTH_COOKIE || name.startsWith(`${V2_AUTH_COOKIE}.`);
}

export const v2CookieOptions = {
  name: V2_AUTH_COOKIE,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
