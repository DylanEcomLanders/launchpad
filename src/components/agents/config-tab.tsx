"use client";

import { useEffect, useState } from "react";
import type { Agent } from "@/lib/agents/types";
import { AVAILABLE_MODELS, NAMED_AGENTS } from "@/lib/agents/types";
import { updateAgent } from "@/lib/agents/data";
import { labelClass, selectClass, textareaClass } from "@/lib/form-styles";

interface ConfigTabProps {
  agent: Agent;
  canEdit: boolean;
  onSaved: () => void;
}

export function ConfigTab({ agent, canEdit, onSaved }: ConfigTabProps) {
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [model, setModel] = useState(agent.model);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Re-sync local state if the parent reloads the agent record
  useEffect(() => {
    setSystemPrompt(agent.systemPrompt);
    setModel(agent.model);
  }, [agent.id, agent.systemPrompt, agent.model]);

  const dirty = systemPrompt !== agent.systemPrompt || model !== agent.model;

  async function save() {
    if (!canEdit || !dirty) return;
    setSaving(true);
    try {
      await updateAgent(agent.id, { systemPrompt, model });
      onSaved();
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You're viewing config in read-only mode. Only admins can edit the system prompt and model.
        </div>
      )}

      <section className="rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="system-prompt" className={labelClass.replace(" mb-2", "")}>System prompt</label>
          {canEdit && (
            <button
              onClick={() => {
                const seed = NAMED_AGENTS.find((a) => a.id === agent.id);
                if (seed) setSystemPrompt(seed.systemPrompt);
              }}
              className="text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B] underline-offset-2 hover:underline"
              title="Reset to the canonical prompt shipped in code"
            >
              Reset to default
            </button>
          )}
        </div>
        <textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={!canEdit}
          rows={10}
          className={`${textareaClass} font-mono text-[13px]`}
        />
        <p className="mt-2 text-[11px] text-[#A0A0A0]">
          {agent.runner === "real"
            ? "Edits here take effect on the next Anthropic call. Use \"Reset to default\" if you break it."
            : "Edits saved here propagate to display only — this agent's runner isn't wired up yet."}
        </p>
      </section>

      <section className="rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)]">
        <label htmlFor="model" className={labelClass}>Model</label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!canEdit}
          className={selectClass}
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className={labelClass}>Tools (read-only)</div>
        {agent.tools.length === 0 ? (
          <p className="text-sm text-[#7A7A7A]">No tools configured.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.map((t) => (
              <span
                key={t}
                className="font-mono text-[11px] px-2 py-1 rounded-md bg-[#F3F3F5] text-[#1B1B1B] border border-[#E5E5EA]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-[#A0A0A0]">
          Tool wiring lands in v1 — these names are placeholders that document Sam, Iris, etc.'s intended capabilities.
        </p>
      </section>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-4 py-2 rounded-lg bg-[#1B1B1B] text-white text-sm font-semibold hover:bg-[#2D2D2D] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          {!dirty && savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-xs text-emerald-600">Saved.</span>
          )}
        </div>
      )}
    </div>
  );
}
