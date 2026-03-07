"use client";

import { useState, useEffect } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";

const STORAGE_KEY = "launchpad-auth";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "ecomlanders2025";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F0F0F0] border border-[#E5E5E5] mb-4">
              <LockClosedIcon className="size-5 text-[#6B6B6B]" />
            </div>
            <h1 className="text-lg font-semibold">Launchpad</h1>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Enter password to continue
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              autoFocus
              className={`w-full px-3 py-2.5 bg-white border rounded-md text-sm focus:outline-none transition-colors placeholder:text-[#CCCCCC] ${
                error
                  ? "border-red-300 focus:border-red-500"
                  : "border-[#E5E5E5] focus:border-[#0A0A0A]"
              }`}
            />
            {error && (
              <p className="text-xs text-red-500">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
