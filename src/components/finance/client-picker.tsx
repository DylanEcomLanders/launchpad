"use client";

import { useEffect, useState } from "react";
import { PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { clientsStore, nowISO, uid } from "@/lib/finance/data";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";
import type { Client } from "@/lib/finance/types";

interface Props {
  /* Currently-selected client id (controlled). */
  clientId: string | undefined;
  /* Called whenever the selection changes. Receives the full client
   * record so the parent can snapshot the relevant fields onto an
   * invoice or wherever else it's needed. */
  onSelect: (client: Client | null) => void;
}

/* Dropdown of existing clients + inline "Create new client" form.
 * Used by the New + Edit invoice forms. Loads clients on mount. */
export function ClientPicker({ clientId, onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New-client form state
  const [draftName, setDraftName] = useState("");
  const [draftContact, setDraftContact] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftCountry, setDraftCountry] = useState("GB");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    clientsStore
      .getAll()
      .then((rows) => {
        if (cancelled) return;
        setClients(rows.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectChange(id: string) {
    if (id === "__new") {
      setCreating(true);
      return;
    }
    const next = clients.find((c) => c.id === id) || null;
    onSelect(next);
  }

  async function handleCreate() {
    if (!draftName.trim()) {
      setError("Name required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const now = nowISO();
      const client: Client = {
        id: uid(),
        name: draftName.trim(),
        contact_name: draftContact.trim() || undefined,
        email: draftEmail.trim() || undefined,
        address: draftAddress.trim() || undefined,
        country: draftCountry.toUpperCase(),
        created_at: now,
        updated_at: now,
      };
      await clientsStore.create(client);
      setClients((rows) =>
        [...rows, client].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onSelect(client);
      // Reset draft form
      setDraftName("");
      setDraftContact("");
      setDraftEmail("");
      setDraftAddress("");
      setDraftCountry("GB");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (creating) {
    return (
      <div className="space-y-3 p-4 bg-background border border-border rounded-lg">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">New client</h4>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="text-xs text-subtle hover:text-foreground underline"
          >
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className={labelClass}>Name *</label>
            <input
              autoFocus
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Nutribloom"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact name</label>
            <input
              type="text"
              value={draftContact}
              onChange={(e) => setDraftContact(e.target.value)}
              placeholder="e.g. Sarah Jones"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder="sarah@example.com"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <textarea
              value={draftAddress}
              onChange={(e) => setDraftAddress(e.target.value)}
              placeholder="14 Wellington Street&#10;London&#10;W1J 5JG"
              rows={3}
              className={textareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>Country (ISO2)</label>
            <input
              type="text"
              value={draftCountry}
              onChange={(e) => setDraftCountry(e.target.value.toUpperCase())}
              maxLength={2}
              className={inputClass}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-background text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-40"
        >
          {saving && <ArrowPathIcon className="size-4 animate-spin" />}
          Save client
        </button>
      </div>
    );
  }

  return (
    <div>
      <select
        value={clientId || ""}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={selectClass}
        disabled={loading}
      >
        <option value="" disabled>
          {loading ? "Loading clients..." : "Select a client..."}
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="__new">+ Create new client</option>
      </select>
    </div>
  );
}
