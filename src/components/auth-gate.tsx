"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

const STORAGE_KEY = "launchpad-auth";
const ROLE_KEY = "launchpad-role";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025";
const CRO_PASSWORD = process.env.NEXT_PUBLIC_CRO_PASSWORD || "cro2025";

export type UserRole = "admin" | "cro";

const RoleContext = createContext<UserRole>("admin");

export function useRole() {
  return useContext(RoleContext);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [entering, setEntering] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const storedRole = sessionStorage.getItem(ROLE_KEY) as UserRole | null;
    if (stored === "true" && storedRole) {
      setAuthed(true);
      setRole(storedRole);
    }
    setChecking(false);
  }, []);

  // Preload the background image
  useEffect(() => {
    const img = new Image();
    img.src = "/login-bg.png";
    img.onload = () => setImgLoaded(true);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "admin");
      setEntering(true);
      setTimeout(() => {
        setAuthed(true);
        setRole("admin");
      }, 600);
    } else if (input === CRO_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "cro");
      setEntering(true);
      setTimeout(() => {
        setAuthed(true);
        setRole("cro");
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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-all duration-500 ${entering ? "opacity-0 scale-110" : "opacity-100 scale-100"}`}>
        {/* ── Full-bleed background image ── */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage: "url(/login-bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Soft dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Bottom vignette for depth */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.15) 100%)" }} />

        {/* ── Login content ── */}
        <div className="relative z-10 w-full max-w-sm px-6">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl mb-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow-sm">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight drop-shadow-md">Launchpad</h1>
            <p className="text-sm text-white/60 mt-1.5 drop-shadow-sm">Ecom Landers Command Centre</p>
          </div>

          {/* Frosted glass login card */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-2xl shadow-[0_8px_60px_rgba(0,0,0,0.3)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-white/50 mb-2 font-medium">Password</label>
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
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-sm text-white focus:outline-none transition-all duration-200 placeholder:text-white/25 backdrop-blur-sm ${
                      error
                        ? "border-red-400/50 focus:border-red-400/70"
                        : "border-white/15 focus:border-white/40"
                    }`}
                  />
                  {input.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      {Array.from({ length: Math.min(input.length, 8) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-[fadeIn_0.15s_ease-out]" />
                      ))}
                    </div>
                  )}
                </div>
                {error && (
                  <p className="text-xs text-red-300 mt-2 flex items-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                    Incorrect password
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-white/90 text-[#1a1a1a] text-sm font-semibold rounded-xl hover:bg-white active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
              >
                Continue
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/30 mt-8 tracking-wider drop-shadow-sm">
            ECOM LANDERS &middot; CONVERSION ENGINE
          </p>
        </div>
      </div>
    );
  }

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}
