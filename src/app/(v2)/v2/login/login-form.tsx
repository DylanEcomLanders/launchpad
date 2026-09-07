"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInV2 } from "@/lib/v2/auth";

const INPUT =
  "w-full px-4 py-3 bg-surface border border-border rounded text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-foreground/30 transition";
const BTN =
  "w-full py-3 rounded bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.99] transition disabled:opacity-50";

export function V2LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await signInV2(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/v2");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoFocus
        required
        className={INPUT}
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        className={INPUT}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
