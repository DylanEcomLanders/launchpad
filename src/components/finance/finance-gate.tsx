"use client";

import { PasscodeGate } from "@/components/passcode-gate";

const STORAGE_KEY = "launchpad-finance-auth";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const FINANCE_PASSCODE = process.env.NEXT_PUBLIC_FINANCE_PASSCODE || "finance2026";

function setFinanceCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `launchpad-finance=${encodeURIComponent(FINANCE_PASSCODE)}; Path=/; Max-Age=${IDLE_TIMEOUT_MS / 1000}; SameSite=Strict`;
}

function clearFinanceCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "launchpad-finance=; Path=/; Max-Age=0; SameSite=Strict";
}

/* Wraps every /finance/* page. Founder-only gate sitting on top of the outer
 * AuthGate. Uses the shared PasscodeGate UI + adds the finance cookie so
 * server-side API routes can validate that the caller went through here. */
export function FinanceGate({ children }: { children: React.ReactNode }) {
  return (
    <PasscodeGate
      title="Finance"
      passcode={FINANCE_PASSCODE}
      storageKey={STORAGE_KEY}
      idleTimeoutMs={IDLE_TIMEOUT_MS}
      onUnlock={setFinanceCookie}
      onLock={clearFinanceCookie}
    >
      {children}
    </PasscodeGate>
  );
}
