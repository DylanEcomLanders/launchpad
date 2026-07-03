"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { isStaging } from "@/lib/env";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  findAppUserByEmail,
  stampSignIn,
  cacheCurrentUser,
  getCachedCurrentUser,
  type AppUser,
} from "@/lib/auth/app-users";

const STORAGE_KEY = "launchpad-auth";
const ROLE_KEY = "launchpad-role";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025";

/* Cookie shadow of the sessionStorage role. Set so server-side API routes
 * (which can't read sessionStorage) can validate that the caller went
 * through AuthGate. SameSite=Strict prevents another origin from
 * triggering an authenticated request. 8h covers a typical work day. */
function setRoleCookie(role: "admin" | "cro" | "team") {
  if (typeof document === "undefined") return;
  document.cookie = `launchpad-role=${role}; Path=/; Max-Age=${8 * 3600}; SameSite=Strict`;
}
const CRO_PASSWORD = process.env.NEXT_PUBLIC_CRO_PASSWORD || "cro2025";
const TEAM_PASSWORD = process.env.NEXT_PUBLIC_TEAM_PASSWORD || "team2026";

/* Login control styling, driven entirely by the app's design tokens so the
 * screen stays synergetic with the rest of Launchpad (dark surface, hairline
 * borders, 4px radii). The right image panel is the only non-token element,
 * an actual photograph. */
const AUTH_INPUT =
  "w-full px-4 py-3 bg-surface border border-border rounded text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-foreground/30 transition";
const AUTH_BTN =
  "w-full py-3 rounded bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-1.5";

export type UserRole = "admin" | "cro" | "team";

const RoleContext = createContext<UserRole>("admin");
/* The resolved signed-in person (magic-link sessions only). Null for legacy
 * shared-password sessions, which carry a role but no identity. */
const CurrentUserContext = createContext<AppUser | null>(null);

export function useRole() {
  return useContext(RoleContext);
}

/** The signed-in person, or null on a legacy shared-password session. Use for
 *  attribution ("marked done by …") and the My Work view. Components that
 *  only care about permissions should keep using useRole(). */
export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

/** Sign the current user out across every layer: Supabase auth session,
 *  the server cookie (DELETE /api/auth/gate), sessionStorage,
 *  the role cookie, the cached-current-user blob. Then full-reload
 *  so AuthGate re-renders the login screen.
 *
 *  Made an exported helper rather than a hook because the sidebar logout
 *  button is a one-shot fire-and-forget - no React state to manage. */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* swallow - we still want to clear local state even if the
     * remote signOut fails (e.g. offline). */
  }
  try {
    await fetch("/api/auth/gate", { method: "DELETE" });
  } catch {
    /* same posture - cookie may already be expired. */
  }
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    document.cookie = "launchpad-role=; Path=/; Max-Age=0; SameSite=Strict";
    cacheCurrentUser(null);
    /* Hard reload so AuthGate remounts from scratch + login form appears. */
    window.location.href = "/";
  }
}

/** Members now use the same dashboard shell as admins, but only reach their
 * own surfaces: Mission Control, My Work, Workspace (their pod), Wiki, the
 * Toolbox tools (carried from the retired Team Hub, still under /team/*),
 * the live task board, client portals, and R&D. Admin-only areas (finance,
 * company, offer, agents, settings, acquisition/delivery/ops sections) are
 * not listed here, so a member hitting one is redirected to /my-work. */
function isTeamAllowedPath(pathname: string): boolean {
  return (
    /* "/" used to be allowed here so team had something to land on,
     * but it's the admin Toolkit (Payment Link / Invoice Generator /
     * Dev Hours / Intelligems / etc) - admin-only by intent. Team
     * lands on /me instead via the redirect below. */
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname === "/hero-offer" ||
    pathname.startsWith("/hero-offer/") ||
    pathname === "/my-work" ||
    /* Delivery — members (team role) get the full kanban board so
     * fulfilment/delivery people like Alister can see + drive client
     * work, not just their own tasks. The management surfaces around
     * it (Onboarding, Old Delivery, KPIs, Sales, Retention, Finance,
     * Admin) stay admin-only via the sidebar gates below. */
    pathname === "/kanban" ||
    pathname.startsWith("/kanban/") ||
    pathname === "/workspace" ||
    pathname.startsWith("/workspace/") ||
    pathname === "/wiki-v2" ||
    pathname.startsWith("/wiki-v2/") ||
    pathname === "/tasks" ||
    pathname.startsWith("/team/") || // Toolbox tool pages
    pathname.startsWith("/portal/") ||
    pathname === "/pods-v2" ||
    pathname.startsWith("/pods-v2/") ||
    pathname === "/rd" ||
    pathname.startsWith("/rd/") ||
    pathname === "/changelog"
  );
}

type Mode = "credentials" | "password";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [entering, setEntering] = useState(false);

  /* "credentials" is the default: email + password via Supabase
   * signInWithPassword. "password" is the shared admin access code. */
  const [mode, setMode] = useState<Mode>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");

  /* Finalise a Supabase session (password sign-in, or a returning session):
   * confirm the email is on the allowlist, resolve the person, set role +
   * identity + cookie. If the email isn't allowed we sign straight back out. */
  const finaliseSession = useCallback(async (authEmail: string, authId: string) => {
    const user = await findAppUserByEmail(authEmail);
    if (!user) {
      setNotAllowed(true);
      await supabase.auth.signOut().catch(() => {});
      cacheCurrentUser(null);
      return false;
    }
    stampSignIn(user.id, authId).catch(() => {});
    sessionStorage.setItem(STORAGE_KEY, "true");
    sessionStorage.setItem(ROLE_KEY, user.role);
    setRoleCookie(user.role);
    cacheCurrentUser(user);
    setRole(user.role);
    setCurrentUser(user);
    setAuthed(true);
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 1. Legacy shared-password session still counts (transition window).
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const storedRole = sessionStorage.getItem(ROLE_KEY) as UserRole | null;
      if (stored === "true" && storedRole) {
        setAuthed(true);
        setRole(storedRole);
        setCurrentUser(getCachedCurrentUser());
        setRoleCookie(storedRole);
        setChecking(false);
        return;
      }

      // 2. Live Supabase session (e.g. returning from an earlier sign-in).
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user?.email && !cancelled) {
            const ok = await finaliseSession(session.user.email, session.user.id);
            if (ok) {
              setChecking(false);
              return;
            }
          }
        } catch {
          /* fall through to the login screen */
        }
      }

      if (!cancelled) setChecking(false);
    }

    boot();

    // React to a sign-in resolving after mount.
    let sub: { unsubscribe: () => void } | undefined;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email) {
          finaliseSession(session.user.email, session.user.id);
        }
      });
      sub = data.subscription;
    }

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [finaliseSession]);

  // Guard: a member on an admin-only route is sent to their home (My Work).
  // The retired /team landing also bounces here (its tool sub-pages stay).
  useEffect(() => {
    if (!authed || role !== "team") return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === "/team" || !isTeamAllowedPath(path)) {
      /* Members land straight on My Tasks - their day-to-day home.
       * /me (profile / password / invoice) stays reachable by URL +
       * via the Submit Invoice sidebar item, we just don't make the
       * card-grid hub their landing. */
      window.location.replace("/my-work");
    }
  }, [authed, role]);

  /* Email + password sign-in. Supabase's signInWithPassword returns a
   * session; the onAuthStateChange handler picks it up and runs the
   * same allowlist check + role/identity setup (finaliseSession). We only
   * surface error states here. */
  const signInWithCredentials = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const normalized = email.trim().toLowerCase();
      if (!normalized || !password) return;
      setCredentialsError("");
      setNotAllowed(false);
      setSending(true);
      try {
        /* Pre-check the allowlist so unrecognised emails fail with a
         * useful message rather than a generic auth error. */
        const allowed = await findAppUserByEmail(normalized);
        if (!allowed) {
          setNotAllowed(true);
          setSending(false);
          return;
        }
        const { error: pwErr } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (pwErr) {
          setCredentialsError("Wrong email or password.");
          setSending(false);
          return;
        }
        /* On success the auth listener fires SIGNED_IN and finalises
         * the session; we just clear the password from memory. */
        setPassword("");
      } catch (err) {
        console.error("[auth] signInWithCredentials:", err);
        setCredentialsError("Sign-in failed. Try again.");
        setSending(false);
      }
    },
    [email, password],
  );

  /* Shared entry transition for a resolved gate role. Sets the legacy
   * sessionStorage + cookie (still read during the transition window),
   * plays the enter animation, and routes team members to /me. */
  const enterAs = useCallback((r: UserRole) => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    sessionStorage.setItem(ROLE_KEY, r);
    setRoleCookie(r);
    setEntering(true);
    setTimeout(() => {
      if (r === "team") {
        // Members land on My Tasks unless they deep-linked to an allowed path.
        const path = typeof window !== "undefined" ? window.location.pathname : "/";
        if (typeof window !== "undefined" && (path === "/team" || !isTeamAllowedPath(path))) {
          window.location.replace("/my-work");
          return;
        }
      }
      setAuthed(true);
      setRole(r);
    }, 600);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const candidate = input;
      /* Primary path: validate server-side at /api/auth/gate, which sets
       * a SIGNED httpOnly session cookie that API routes trust (C1 fix).
       * Falls back to the legacy client comparison when the server gate
       * isn't configured yet (AUTH_SESSION_SECRET / *_PASSWORD unset), so
       * nothing breaks during the transition. */
      try {
        const res = await fetch("/api/auth/gate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: candidate }),
        });
        if (res.ok) {
          const data = (await res.json()) as { role?: UserRole };
          if (data.role === "admin" || data.role === "cro" || data.role === "team") {
            enterAs(data.role);
            return;
          }
        }
      } catch {
        /* network issue — fall through to the legacy comparison */
      }

      // Legacy fallback (transition window — remove once env vars are set).
      if (candidate === ADMIN_PASSWORD) return enterAs("admin");
      if (candidate === CRO_PASSWORD) return enterAs("cro");
      if (candidate === TEAM_PASSWORD) return enterAs("team");

      setError(true);
      setShaking(true);
      setInput("");
      setTimeout(() => setShaking(false), 500);
    },
    [input, enterAs],
  );

  /* Non-live build indicator. Prefer the env var (isStaging), but also fall
   * back to the hostname so the sandbox flags itself even when
   * NEXT_PUBLIC_APP_ENV isn't set on that Vercel project. Never true on the
   * live custom domain (ecomlanders.app). */
  const isTestBuild =
    isStaging() || (typeof window !== "undefined" && /sandbox/i.test(window.location.hostname));

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div
        className={`min-h-screen flex bg-background transition-opacity duration-500 ${
          entering ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* ── Left: form ── */}
        <div className="flex flex-1 flex-col justify-between px-6 py-12 sm:px-12 lg:px-16">
          {/* Logo top-left */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Ecom Landers" className="h-5 brightness-0 invert" />
          </div>

          {/* Form bottom-left */}
          <div className="w-full max-w-sm">
            {isTestBuild && (
              <p className="mb-3 text-2xs font-semibold uppercase tracking-[0.14em] text-warning">
                Test Build
              </p>
            )}
            {mode === "credentials" ? (
              <>
                <Heading
                  title={<><span className="text-foreground/60">Welcome to</span> Launchpad</>}
                  subtitle="The operating system for the ecomlanders team."
                />
                <form onSubmit={signInWithCredentials} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setNotAllowed(false); setCredentialsError(""); }}
                    placeholder="Enter your email"
                    autoFocus
                    className={AUTH_INPUT}
                  />
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setCredentialsError(""); }}
                      placeholder="Enter your password"
                      className={AUTH_INPUT}
                    />
                    {notAllowed && (
                      <p className="mt-2 text-xs text-warning leading-relaxed">
                        That email isn&apos;t on the team list. Ask an admin to invite you.
                      </p>
                    )}
                    {credentialsError && <p className="mt-2 text-xs text-danger">{credentialsError}</p>}
                  </div>
                  <button type="submit" disabled={sending} className={AUTH_BTN}>
                    {sending ? (
                      "Entering..."
                    ) : (
                      <>
                        Enter Launchpad
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 17 17 7" />
                          <path d="M8 7h9v9" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className="mt-4 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Admin access
                </button>
              </>
            ) : (
              <>
                <Heading title="Admin access" subtitle="Enter your access code to continue." />
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className={shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}>
                    <input
                      type="password"
                      value={input}
                      onChange={(e) => { setInput(e.target.value); setError(false); }}
                      placeholder="Enter access code"
                      autoFocus
                      className={`${AUTH_INPUT} ${error ? "border-danger/60 focus:border-danger" : ""}`}
                    />
                  </div>
                  {error && <p className="text-xs text-danger">Incorrect code. Try again.</p>}
                  <button type="submit" className={AUTH_BTN}>
                    Continue
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setMode("credentials")}
                  className="mt-6 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Right: image with overlaid headline ── */}
        <div className="relative hidden md:block md:w-[45%] m-3 rounded overflow-hidden border border-border-faint">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login-final-v3.gif" alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <RoleContext.Provider value={role}>
      <CurrentUserContext.Provider value={currentUser}>
        {children}
      </CurrentUserContext.Provider>
    </RoleContext.Provider>
  );
}

function Heading({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-xl font-medium text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}
