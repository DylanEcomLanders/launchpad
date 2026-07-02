/* ── Environment awareness ──
 *
 * One place to answer "which environment am I in?" so the app can
 * behave differently on the live build vs the staging sandbox.
 *
 * Set NEXT_PUBLIC_APP_ENV per Vercel environment:
 *   - production  → the live build (ecomlanders.app)
 *   - staging     → the sandbox (sandbox.ecomlanders.app)
 * Local `npm run dev` reports "development" when it isn't set.
 *
 * The value is NEXT_PUBLIC_ so it's readable on both the server and the
 * client (inlined at build time). It drives the SANDBOX ribbon and can
 * gate any behaviour that must never fire off the live build.
 */

export type AppEnv = "production" | "staging" | "development";

export const APP_ENV: AppEnv =
  (process.env.NEXT_PUBLIC_APP_ENV as AppEnv | undefined) ??
  (process.env.NODE_ENV === "development" ? "development" : "production");

/** The live, client-facing build. */
export function isProduction(): boolean {
  return APP_ENV === "production";
}

/** The deployed staging sandbox (a real URL, but not live usage). */
export function isStaging(): boolean {
  return APP_ENV === "staging";
}

/**
 * Anything that is NOT the live build - staging or local dev. Use this
 * to guard side effects you'd rather never fire outside production
 * (belt-and-braces on top of simply withholding integration secrets
 * from the staging environment).
 */
export function isSandbox(): boolean {
  return APP_ENV !== "production";
}
