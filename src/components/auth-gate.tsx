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

// ── Animated grid background ──
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow — top left */}
      <div
        className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }}
      />

      {/* Radial glow — bottom right */}
      <div
        className="absolute -bottom-[20%] -right-[15%] w-[60%] h-[60%] rounded-full opacity-15 blur-[100px]"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
      />

      {/* Floating orbs */}
      <div className="absolute top-[20%] right-[25%] w-2 h-2 rounded-full bg-blue-500/30 animate-pulse" />
      <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 rounded-full bg-purple-500/20 animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-[40%] right-[10%] w-1 h-1 rounded-full bg-blue-400/25 animate-pulse" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-[30%] left-[35%] w-1.5 h-1.5 rounded-full bg-indigo-400/20 animate-pulse" style={{ animationDelay: "0.5s" }} />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}

// ── Animated metrics ticker ──
function MetricsTicker() {
  const metrics = [
    { label: "AVG CVR LIFT", value: "+1.8%", color: "#10B981" },
    { label: "CLIENT ROI", value: "4.2x", color: "#3B82F6" },
    { label: "PAGES SHIPPED", value: "847", color: "#8B5CF6" },
    { label: "REVENUE RECOVERED", value: "\u00a32.4M", color: "#F59E0B" },
  ];

  return (
    <div className="flex items-center gap-8 mt-8">
      {metrics.map((m) => (
        <div key={m.label} className="text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-1">{m.label}</p>
          <p className="text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<UserRole>("admin");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const storedRole = sessionStorage.getItem(ROLE_KEY) as UserRole | null;
    if (stored === "true" && storedRole) {
      setAuthed(true);
      setRole(storedRole);
    }
    setChecking(false);
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
      }, 400);
    } else if (input === CRO_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(ROLE_KEY, "cro");
      setEntering(true);
      setTimeout(() => {
        setAuthed(true);
        setRole("cro");
      }, 400);
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
      <div className={`min-h-screen flex items-center justify-center relative transition-opacity duration-300 ${entering ? "opacity-0 scale-105" : "opacity-100"}`}>
        <GridBackground />

        <div className="relative z-10 w-full max-w-sm px-6">
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm mb-5 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Launchpad</h1>
            <p className="text-[13px] text-white/40 mt-1.5">Ecom Landers Command Centre</p>
          </div>

          {/* Login card */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.1em] text-white/40 mb-2 font-medium">Password</label>
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
                    className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-sm text-white focus:outline-none transition-all duration-200 placeholder:text-white/20 ${
                      error
                        ? "border-red-500/50 focus:border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        : "border-white/[0.08] focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                    }`}
                  />
                  {input.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      {Array.from({ length: Math.min(input.length, 6) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-[fadeIn_0.15s_ease-out]" />
                      ))}
                    </div>
                  )}
                </div>
                {error && (
                  <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                    Incorrect password
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-white text-[#0A0A0A] text-sm font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150 shadow-[0_2px_15px_rgba(255,255,255,0.1)]"
              >
                Continue
              </button>
            </form>
          </div>

          {/* Metrics */}
          <div className="hidden md:block">
            <MetricsTicker />
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/15 mt-8 tracking-wide">
            ECOM LANDERS &middot; CONVERSION ENGINE
          </p>
        </div>
      </div>
    );
  }

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}
