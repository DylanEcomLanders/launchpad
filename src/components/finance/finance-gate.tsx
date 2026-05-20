"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";

const STORAGE_KEY = "launchpad-finance-auth";
const LAST_ACTIVITY_KEY = "launchpad-finance-last-activity";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const FINANCE_PASSCODE = process.env.NEXT_PUBLIC_FINANCE_PASSCODE || "finance2026";

function setFinanceCookie(passcode: string) {
  if (typeof document === "undefined") return;
  document.cookie = `launchpad-finance=${encodeURIComponent(passcode)}; Path=/; Max-Age=${IDLE_TIMEOUT_MS / 1000}; SameSite=Strict`;
}

function clearFinanceCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "launchpad-finance=; Path=/; Max-Age=0; SameSite=Strict";
}

/* Wraps every /finance/* page. Founder-only gate sitting on top of the
 * outer AuthGate. Separate passcode (FINANCE_PASSCODE) and a 30-minute
 * idle timeout — anything more lenient defeats the point. */
export function FinanceGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    clearFinanceCookie();
    setAuthed(false);
    setInput("");
  }, []);

  const bumpActivity = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(lockOut, IDLE_TIMEOUT_MS);
  }, [lockOut]);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    const fresh = lastActivity && Date.now() - lastActivity < IDLE_TIMEOUT_MS;
    if (stored === "true" && fresh) {
      setAuthed(true);
      setFinanceCookie(FINANCE_PASSCODE);
      bumpActivity();
    } else if (stored === "true") {
      lockOut();
    }
    setChecking(false);
  }, [bumpActivity, lockOut]);

  useEffect(() => {
    if (!authed) return;
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    const handler = () => bumpActivity();
    for (const e of events) window.addEventListener(e, handler, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, handler);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [authed, bumpActivity]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input === FINANCE_PASSCODE) {
        sessionStorage.setItem(STORAGE_KEY, "true");
        setFinanceCookie(FINANCE_PASSCODE);
        bumpActivity();
        setAuthed(true);
      } else {
        setError(true);
        setShaking(true);
        setInput("");
        setTimeout(() => setShaking(false), 500);
      }
    },
    [input, bumpActivity],
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E5E5EA] border-t-[#1B1B1B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#FAFAFB]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B1B1B] text-white mb-5 shadow-[var(--shadow-card)]">
              <LockClosedIcon className="size-6" />
            </div>
            <h1 className="text-xl font-semibold text-[#1B1B1B] tracking-tight">
              Finance
            </h1>
            <p className="text-sm text-[#7A7A7A] mt-1.5">
              Founder access only
            </p>
          </div>

          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-[var(--shadow-card)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-[#7A7A7A] mb-2 font-semibold">
                  Passcode
                </label>
                <div className={shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}>
                  <input
                    type="password"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setError(false);
                    }}
                    placeholder="Enter finance passcode"
                    autoFocus
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-[#1B1B1B] focus:outline-none transition-all duration-200 placeholder:text-[#C5C5C5] ${
                      error
                        ? "border-red-300 focus:border-red-400"
                        : "border-[#E5E5EA] focus:border-[#1B1B1B]"
                    }`}
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 mt-2">Incorrect passcode</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:opacity-90 active:scale-[0.99] transition-all"
              >
                Unlock
              </button>
            </form>
            <p className="text-[11px] text-[#A0A0A0] mt-4 text-center">
              Session locks after 30 minutes idle
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
