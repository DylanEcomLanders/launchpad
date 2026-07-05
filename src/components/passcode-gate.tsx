"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

/* Mirror the main login (AuthGate) controls so the Finance / Admin gates read
 * as the same sign-in surface, one step deeper. */
const AUTH_INPUT =
  "w-full px-4 py-3 bg-surface border border-border rounded text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-foreground/30 transition";
const AUTH_BTN =
  "w-full py-3 rounded bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-1.5";

interface PasscodeGateProps {
  /** Shown as the eyebrow + h1 (e.g. "Finance", "Admin"). */
  title: string;
  /** Expected password. */
  passcode: string;
  /** sessionStorage key for the "unlocked" flag. */
  storageKey: string;
  /** Auto-lock after this many ms of idle. 0/undefined disables. */
  idleTimeoutMs?: number;
  /** Optional callback fired on successful unlock (e.g. to set a cookie). */
  onUnlock?: () => void;
  /** Optional callback fired on lockout (e.g. to clear a cookie). */
  onLock?: () => void;
  children: React.ReactNode;
}

/* Shared password gate used by Finance and Admin. Centered card on the dark
 * canvas, restrained chrome, single accent on the Unlock button. Optional idle
 * auto-lock + unlock/lock callbacks for cookie management. */
export function PasscodeGate({
  title,
  passcode,
  storageKey,
  idleTimeoutMs,
  onUnlock,
  onLock,
  children,
}: PasscodeGateProps) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shaking, setShaking] = useState(false);
  const lastActivityKey = `${storageKey}-last-activity`;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockOut = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(lastActivityKey);
    onLock?.();
    setAuthed(false);
    setInput("");
  }, [storageKey, lastActivityKey, onLock]);

  const bumpActivity = useCallback(() => {
    if (!idleTimeoutMs) return;
    sessionStorage.setItem(lastActivityKey, String(Date.now()));
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(lockOut, idleTimeoutMs);
  }, [idleTimeoutMs, lockOut, lastActivityKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== "true") {
      setChecking(false);
      return;
    }
    if (!idleTimeoutMs) {
      setAuthed(true);
      onUnlock?.();
      setChecking(false);
      return;
    }
    const lastActivity = Number(sessionStorage.getItem(lastActivityKey) || 0);
    const fresh = lastActivity && Date.now() - lastActivity < idleTimeoutMs;
    if (fresh) {
      setAuthed(true);
      onUnlock?.();
      bumpActivity();
    } else {
      lockOut();
    }
    setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authed || !idleTimeoutMs) return;
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
  }, [authed, idleTimeoutMs, bumpActivity]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input === passcode) {
        sessionStorage.setItem(storageKey, "true");
        onUnlock?.();
        bumpActivity();
        setAuthed(true);
        setError(false);
      } else {
        setError(true);
        setShaking(true);
        setInput("");
        setTimeout(() => setShaking(false), 500);
      }
    },
    [input, passcode, storageKey, onUnlock, bumpActivity],
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        {/* Clean, centered form in the main-login idiom (no image panel). */}
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Ecom Landers" className="mb-10 h-5 brightness-0 invert" />

          <p className="mb-4 inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-subtle">
            <LockClosedIcon className="size-3" />
            Restricted
          </p>
          <div className="mb-7">
            <h1 className="text-xl font-medium text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Enter the passcode to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}>
              <input
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(false);
                }}
                placeholder="Enter passcode"
                autoFocus
                className={`${AUTH_INPUT} ${error ? "border-danger/60 focus:border-danger" : ""}`}
              />
            </div>
            {error && <p className="text-xs text-danger">Incorrect passcode. Try again.</p>}
            <button type="submit" className={AUTH_BTN}>
              Unlock
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
            </button>
          </form>

          {idleTimeoutMs ? (
            <p className="mt-4 text-2xs uppercase tracking-[0.08em] text-subtle">
              Auto-locks after {Math.floor(idleTimeoutMs / 60000)} minutes idle
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
