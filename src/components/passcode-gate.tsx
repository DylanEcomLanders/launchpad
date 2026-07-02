"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LockClosedIcon } from "@heroicons/react/24/outline";

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
        <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-[340px]">
          {/* Eyebrow with lock chip + bold title — Well chrome pattern */}
          <div className="text-center mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle mb-3 inline-flex items-center gap-1.5">
              <LockClosedIcon className="size-2.5" />
              Ecomlanders
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {title}
            </h1>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-border rounded-md p-5"
          >
            <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle mb-2">
              Passcode
            </label>
            <div className={shaking ? "animate-[shake_0.4s_ease-in-out]" : ""}>
              <input
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(false);
                }}
                placeholder="Enter to unlock"
                autoFocus
                className={`w-full px-3 py-2.5 bg-background border rounded-md text-sm text-foreground focus:outline-none transition-colors placeholder:text-border ${
                  error
                    ? "border-red-500/60 focus:border-red-500"
                    : "border-border focus:border-border"
                }`}
              />
            </div>
            {error && (
              <p className="text-[11px] text-red-400 mt-2">Incorrect passcode</p>
            )}
            <button
              type="submit"
              className="mt-4 w-full px-3 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 active:scale-[0.99] transition-all"
            >
              Unlock
            </button>
          </form>

          {idleTimeoutMs ? (
            <p className="text-[10px] text-subtle mt-4 text-center uppercase tracking-[0.08em]">
              Auto-locks after {Math.floor(idleTimeoutMs / 60000)} minutes idle
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
