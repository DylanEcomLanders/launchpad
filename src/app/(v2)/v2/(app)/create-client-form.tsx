"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/v2/clients";

const INPUT =
  "w-full px-4 py-3 bg-surface border border-border rounded text-sm text-foreground placeholder:text-subtle focus:outline-none focus:border-foreground/30 transition";
const BTN =
  "shrink-0 px-4 py-3 rounded bg-foreground text-background text-sm font-medium hover:bg-foreground/90 active:scale-[0.99] transition disabled:opacity-50";

export function CreateClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await createClient(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create client.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          maxLength={200}
          required
          className={INPUT}
        />
        <button type="submit" disabled={pending} className={BTN}>
          {pending ? "Saving…" : "Add"}
        </button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </form>
  );
}
