"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Tackboard } from "@/components/tackboard";
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

/** Members now use the same dashboard shell as admins, but only reach their
 * own surfaces: Mission Control, My Work, Workspace (their pod), Wiki, the
 * Toolbox tools (carried from the retired Team Hub, still under /team/*),
 * the live task board, client portals, and R&D. Admin-only areas (finance,
 * company, offer, agents, settings, acquisition/delivery/ops sections) are
 * not listed here, so a member hitting one is redirected to /my-work. */
function isTeamAllowedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/my-work" ||
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

type Mode = "magic" | "password";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [entering, setEntering] = useState(false);

  // Magic-link state.
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  /* Finalise a magic-link session: confirm the email is on the allowlist,
   * resolve the person, set role + identity + cookie. If the email isn't
   * allowed we sign the Supabase session straight back out. */
  const finaliseMagicSession = useCallback(async (authEmail: string, authId: string) => {
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

      // 2. Live Supabase magic-link session (e.g. returning from the email link).
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user?.email && !cancelled) {
            const ok = await finaliseMagicSession(
              session.user.email,
              session.user.id,
            );
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

    // React to the magic-link redirect resolving after mount.
    let sub: { unsubscribe: () => void } | undefined;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email) {
          finaliseMagicSession(session.user.email, session.user.id);
        }
      });
      sub = data.subscription;
    }

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [finaliseMagicSession]);

  // Guard: a member on an admin-only route is sent to their home (My Work).
  // The retired /team landing also bounces here (its tool sub-pages stay).
  useEffect(() => {
    if (!authed || role !== "team") return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path === "/team" || !isTeamAllowedPath(path)) {
      window.location.replace("/my-work");
    }
  }, [authed, role]);

  const sendMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const normalized = email.trim().toLowerCase();
      if (!normalized) return;
      setNotAllowed(false);
      setSending(true);
      try {
        // Pre-check the allowlist so we can give a clear "not invited" message
        // instead of silently sending a link that won't grant access.
        const allowed = await findAppUserByEmail(normalized);
        if (!allowed) {
          setNotAllowed(true);
          setSending(false);
          return;
        }
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: normalized,
          options: { emailRedirectTo: window.location.origin + window.location.pathname },
        });
        if (otpErr) throw otpErr;
        setLinkSent(true);
      } catch (err) {
        console.error("[auth] sendMagicLink:", err);
        setError(true);
        setTimeout(() => setError(false), 3000);
      } finally {
        setSending(false);
      }
    },
    [email],
  );

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "admin");
      setRoleCookie("admin");
      setEntering(true);
      setTimeout(() => {
        setAuthed(true);
        setRole("admin");
      }, 600);
    } else if (input === CRO_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "cro");
      setRoleCookie("cro");
      setEntering(true);
      setTimeout(() => {
        setAuthed(true);
        setRole("cro");
      }, 600);
    } else if (input === TEAM_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "team");
      setRoleCookie("team");
      setEntering(true);
      setTimeout(() => {
        // Members land on My Work unless they deep-linked to an allowed path.
        const path = typeof window !== "undefined" ? window.location.pathname : "/";
        if (typeof window !== "undefined" && (path === "/team" || !isTeamAllowedPath(path))) {
          window.location.replace("/my-work");
          return;
        }
        setAuthed(true);
        setRole("team");
      }, 600);
    } else {
      setError(true);
      setShaking(true);
      setInput("");
      setTimeout(() => setShaking(false), 500);
    }
  }, [input]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={`min-h-screen relative overflow-hidden transition-all duration-500 ${entering ? "opacity-0 scale-110" : "opacity-100 scale-100"}`}>
        {/* ── Tackboard as the login backdrop ── */}
        <div className="absolute inset-0">
          <Tackboard loginMode />
        </div>

        {/* Soft dark overlay behind the login card for contrast */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* ── Login content (centered floating card) ── */}
        <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
          <div className="relative z-20 w-full max-w-sm pointer-events-auto">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#181818]/10 border border-white/20 backdrop-blur-xl mb-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/el-logo.svg" alt="Ecom Landers" className="w-8 h-8 brightness-0 invert drop-shadow-sm" />
            </div>
            <h1 className="text-2xl font-semibold text-white drop-shadow-md">Launchpad</h1>
            <p className="text-sm text-white/60 mt-1.5 drop-shadow-sm">Ecom Landers Command Centre</p>
          </div>

          {/* Frosted glass login card */}
          <div className="bg-[#181818]/10 border border-white/20 rounded-2xl p-6 backdrop-blur-2xl shadow-[0_8px_60px_rgba(0,0,0,0.3)]">
            {mode === "magic" ? (
              linkSent ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-400/20 border border-emerald-300/30 mb-4">
                    <svg className="w-6 h-6 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7l9-4 9 4" /></svg>
                  </div>
                  <p className="text-sm text-white font-medium">Check your email</p>
                  <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                    We sent a sign-in link to<br />
                    <span className="text-white/80">{email.trim().toLowerCase()}</span>
                  </p>
                  <button
                    onClick={() => { setLinkSent(false); setEmail(""); }}
                    className="text-xs text-white/40 hover:text-white/70 mt-5 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={sendMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-white/50 mb-2 font-medium">Work email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setNotAllowed(false); }}
                      placeholder="you@ecomlanders.com"
                      autoFocus
                      className="w-full px-4 py-3 bg-[#181818]/10 border border-white/15 focus:border-white/40 rounded-xl text-sm text-white focus:outline-none transition-all duration-200 placeholder:text-white/25 backdrop-blur-sm"
                    />
                    {notAllowed && (
                      <p className="text-xs text-amber-300 mt-2 leading-relaxed">
                        That email isn&apos;t on the team list yet. Ask an admin to invite you.
                      </p>
                    )}
                    {error && (
                      <p className="text-xs text-red-300 mt-2">Couldn&apos;t send the link. Try again.</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full px-4 py-3 bg-white text-[#0C0C0C] text-sm font-semibold rounded-xl hover:bg-[#E5E5EA] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.15)] disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Email me a sign-in link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("password")}
                    className="w-full text-center text-[11px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    Use access code instead
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-white/50 mb-2 font-medium">Access code</label>
                  <div className={`relative ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
                    <input
                      type="password"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        setError(false);
                      }}
                      placeholder="Enter access code"
                      autoFocus
                      className={`w-full px-4 py-3 bg-[#181818]/10 border rounded-xl text-sm text-white focus:outline-none transition-all duration-200 placeholder:text-white/25 backdrop-blur-sm ${
                        error
                          ? "border-red-400/50 focus:border-red-400/70"
                          : "border-white/15 focus:border-white/40"
                      }`}
                    />
                    {input.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        {Array.from({ length: Math.min(input.length, 8) }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#181818]/50 animate-[fadeIn_0.15s_ease-out]" />
                        ))}
                      </div>
                    )}
                  </div>
                  {error && (
                    <p className="text-xs text-red-300 mt-2 flex items-center gap-1.5">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                      Incorrect code
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-white text-[#0C0C0C] text-sm font-semibold rounded-xl hover:bg-[#E5E5EA] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="w-full text-center text-[11px] text-white/40 hover:text-white/70 transition-colors"
                >
                  Sign in with email instead
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/30 mt-8 tracking-wider drop-shadow-sm">
            ECOM LANDERS &middot; CONVERSION ENGINE
          </p>
          </div>
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
