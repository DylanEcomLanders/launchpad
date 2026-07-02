"use client";

/* ── Password reset landing ──
 *
 * Where Supabase's password-reset email link redirects to. Supabase
 * parses the recovery token from the URL hash automatically; we just
 * need to surface a "set a new password" form and call
 * supabase.auth.updateUser({ password }) once the user submits.
 *
 * Public route (outside the dashboard AuthGate) so the link works
 * before they're signed in.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  /* Supabase will fire SIGNED_IN with a recovery session as soon as it
   * parses the token from the URL hash. If the session resolves we
   * know the user clicked a valid link. Otherwise they landed here
   * without one - show a "request a fresh link" message. */
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasToken(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasToken(true);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: pw });
      if (updErr) throw updErr;
      setDone(true);
      /* Bounce them back to the main app after a beat - their auth
       * session is now active so they go straight in. */
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      console.error("[reset-password] updateUser:", err);
      setError("Couldn't update password. Try requesting a new link.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-muted rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/el-logo.svg"
              alt="Ecom Landers"
              className="w-8 h-8 brightness-0 invert"
            />
          </div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-subtle mt-1.5">Launchpad team account</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {!hasToken ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-foreground font-medium">
                Link expired or invalid
              </p>
              <p className="text-xs text-subtle leading-relaxed">
                Head back to sign in and request a fresh reset link.
              </p>
              <Link
                href="/"
                className="inline-block mt-3 px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 border border-success/20">
                <svg
                  className="w-6 h-6 text-success"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 13 4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-foreground font-medium">Password updated</p>
              <p className="text-xs text-subtle">Sending you in...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-subtle mb-2 font-medium">
                  New password
                </label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setError("");
                  }}
                  placeholder="At least 8 characters"
                  autoFocus
                  className="w-full px-4 py-3 bg-background border border-border focus:border-border rounded-xl text-sm text-foreground focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-subtle mb-2 font-medium">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-3 bg-background border border-border focus:border-border rounded-xl text-sm text-foreground focus:outline-none transition-colors"
                />
                {error && (
                  <p className="text-xs text-danger mt-2">{error}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {submitting ? "Updating..." : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
