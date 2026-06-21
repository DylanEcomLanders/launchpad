"use client";

import { useCallback, useEffect, useState } from "react";
import { CLIENTS } from "../mock-data";

// Browser-persisted prototype store for the Strategy area. Survives reload via
// localStorage; seeded from the mock client strategies. No Supabase — this is
// still an isolated preview, just an interactive one.

const KEY = "pods-preview-strategy-v1";

export type HypStatus = "idea" | "testing" | "validated";
export const HYP_CYCLE: HypStatus[] = ["idea", "testing", "validated"];

export interface Hyp {
  id: string;
  text: string;
  status: HypStatus;
}
export interface StratNote {
  id: string;
  at: string; // YYYY-MM-DD
  text: string;
}
export interface ClientStrat {
  thesis: string;
  focus: string[];
  hypotheses: Hyp[];
  notes: StratNote[];
}
export interface StrategyState {
  clients: Record<string, ClientStrat>;
  handled: string[]; // touchpoint task ids marked done
}

function buildDefault(): StrategyState {
  const clients: Record<string, ClientStrat> = {};
  for (const c of CLIENTS) {
    if (!c.strategy) continue;
    clients[c.id] = {
      thesis: c.strategy.thesis,
      focus: [...c.strategy.focus],
      hypotheses: c.strategy.hypotheses.map((h, i) => ({
        id: `${c.id}-h${i}`,
        text: h.text,
        status: h.status,
      })),
      notes: [],
    };
  }
  return { clients, handled: [] };
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useStrategyStore() {
  const [state, setState] = useState<StrategyState>(buildDefault);
  const [loaded, setLoaded] = useState(false);

  // Load saved state after mount (keeps SSR/first paint deterministic).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as StrategyState;
        const def = buildDefault();
        setState({
          clients: { ...def.clients, ...(saved.clients ?? {}) },
          handled: saved.handled ?? [],
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  // Persist on change (after initial load so we don't clobber saved data).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, loaded]);

  const patchClient = useCallback((id: string, fn: (c: ClientStrat) => ClientStrat) => {
    setState((s) => ({ ...s, clients: { ...s.clients, [id]: fn(s.clients[id]) } }));
  }, []);

  const setThesis = useCallback(
    (id: string, thesis: string) => patchClient(id, (c) => ({ ...c, thesis })),
    [patchClient],
  );
  const addFocus = useCallback(
    (id: string, value: string) =>
      patchClient(id, (c) => ({ ...c, focus: [...c.focus, value] })),
    [patchClient],
  );
  const removeFocus = useCallback(
    (id: string, idx: number) =>
      patchClient(id, (c) => ({ ...c, focus: c.focus.filter((_, i) => i !== idx) })),
    [patchClient],
  );
  const addHyp = useCallback(
    (id: string, text: string) =>
      patchClient(id, (c) => ({
        ...c,
        hypotheses: [...c.hypotheses, { id: newId(), text, status: "idea" }],
      })),
    [patchClient],
  );
  const updateHyp = useCallback(
    (id: string, hid: string, patch: Partial<Hyp>) =>
      patchClient(id, (c) => ({
        ...c,
        hypotheses: c.hypotheses.map((h) => (h.id === hid ? { ...h, ...patch } : h)),
      })),
    [patchClient],
  );
  const removeHyp = useCallback(
    (id: string, hid: string) =>
      patchClient(id, (c) => ({ ...c, hypotheses: c.hypotheses.filter((h) => h.id !== hid) })),
    [patchClient],
  );
  const cycleHyp = useCallback(
    (id: string, hid: string) =>
      patchClient(id, (c) => ({
        ...c,
        hypotheses: c.hypotheses.map((h) =>
          h.id === hid
            ? { ...h, status: HYP_CYCLE[(HYP_CYCLE.indexOf(h.status) + 1) % HYP_CYCLE.length] }
            : h,
        ),
      })),
    [patchClient],
  );
  const addNote = useCallback(
    (id: string, text: string) =>
      patchClient(id, (c) => ({
        ...c,
        notes: [{ id: newId(), at: todayYMD(), text }, ...c.notes],
      })),
    [patchClient],
  );

  const toggleHandled = useCallback((taskId: string) => {
    setState((s) => ({
      ...s,
      handled: s.handled.includes(taskId)
        ? s.handled.filter((t) => t !== taskId)
        : [...s.handled, taskId],
    }));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setState(buildDefault());
  }, []);

  return {
    state,
    loaded,
    setThesis,
    addFocus,
    removeFocus,
    addHyp,
    updateHyp,
    removeHyp,
    cycleHyp,
    addNote,
    toggleHandled,
    reset,
  };
}
