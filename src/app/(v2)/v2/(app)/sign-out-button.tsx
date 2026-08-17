"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOutV2 } from "@/lib/v2/auth";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setError("");
    setPending(true);
    try {
      await signOutV2();
      router.replace("/v2/login");
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Sign-out failed.");
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
