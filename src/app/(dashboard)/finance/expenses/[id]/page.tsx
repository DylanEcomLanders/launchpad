"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  DocumentIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ForwardIcon,
} from "@heroicons/react/24/outline";
import {
  expensesStore,
  fmtMoney,
  fmtDateUK,
  nowISO,
  todayISO,
  uid,
  deriveExpenseStatus,
} from "@/lib/finance/data";
import {
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
  type RecurringFrequency,
} from "@/lib/finance/types";
import { inputClass, selectClass, textareaClass } from "@/lib/form-styles";

const fieldLabel = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-2";

const STATUS_BADGE: Record<ExpenseStatus, { cls: string; label: string }> = {
  due: { cls: "bg-warning/10 text-warning", label: "Due" },
  paid: { cls: "bg-success/10 text-success", label: "Paid" },
  overdue: { cls: "bg-danger/10 text-danger", label: "Overdue" },
  disputed: { cls: "bg-warning/10 text-warning", label: "Disputed" },
};

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    expensesStore.getById(params.id).then((e) => {
      if (cancelled) return;
      setExpense(e);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function markPaid() {
    if (!expense) return;
    const updated = await expensesStore.update(expense.id, {
      status: "paid",
      date_paid: expense.date_paid || todayISO(),
      disputed_at: undefined,
      disputed_reason: undefined,
      updated_at: nowISO(),
    });
    if (updated) setExpense(updated);
  }

  async function markDue() {
    if (!expense) return;
    const updated = await expensesStore.update(expense.id, {
      status: "due",
      date_paid: undefined,
      disputed_at: undefined,
      disputed_reason: undefined,
      updated_at: nowISO(),
    });
    if (updated) setExpense(updated);
  }

  async function changeStatus(next: ExpenseStatus) {
    if (!expense) return;
    if (next === "disputed") {
      const reason = window.prompt(
        "Reason for dispute (optional, shown on the expense detail):",
        expense.disputed_reason || "",
      );
      if (reason === null) return;
      const updated = await expensesStore.update(expense.id, {
        status: "disputed",
        disputed_at: nowISO(),
        disputed_reason: reason,
        updated_at: nowISO(),
      });
      if (updated) setExpense(updated);
      return;
    }
    const updates: Partial<Expense> = {
      status: next,
      disputed_at: undefined,
      disputed_reason: undefined,
      updated_at: nowISO(),
    };
    if (next === "paid" && !expense.date_paid) updates.date_paid = todayISO();
    if (next === "due") updates.date_paid = undefined;
    const updated = await expensesStore.update(expense.id, updates);
    if (updated) setExpense(updated);
  }

  async function handleDelete() {
    if (!expense) return;
    if (!confirm(`Delete expense from ${expense.supplier_name}?`)) return;
    await expensesStore.remove(expense.id);
    router.push("/finance/expenses");
  }

  async function openDoc() {
    if (!expense) return;
    /* Prefer file_path (re-signs a fresh 15min URL on demand). Fall
     * back to file_url for legacy rows that were saved without a
     * file_path - those URLs may have expired by now, but at least
     * the click does something instead of silently failing. */
    if (!expense.file_path) {
      if (expense.file_url) {
        window.open(expense.file_url, "_blank", "noopener");
      } else {
        setError("No file attached to this expense.");
      }
      return;
    }
    setOpeningDoc(true);
    try {
      const res = await fetch("/api/finance/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: expense.file_path }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      window.open(json.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open document");
    } finally {
      setOpeningDoc(false);
    }
  }

  function startEdit() {
    if (!expense) return;
    setDraft({ ...expense });
    setEditing(true);
    setError("");
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  async function saveEdit() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const updates: Partial<Expense> = { ...draft, updated_at: nowISO() };
      // Re-derive next recurring date if frequency or due date changed.
      if (draft.recurring) {
        updates.recurring_next_date = nextOccurrence(draft.date_due, draft.recurring);
      } else {
        updates.recurring_next_date = undefined;
      }
      const updated = await expensesStore.update(draft.id, updates);
      if (updated) setExpense(updated);
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function rollForward() {
    if (!expense || !expense.recurring) return;
    if (!confirm(`Create next ${expense.recurring} occurrence of this expense?`)) return;
    setRolling(true);
    setError("");
    try {
      const nextDue = expense.recurring_next_date || nextOccurrence(expense.date_due, expense.recurring);
      const now = nowISO();
      const next: Expense = {
        ...expense,
        id: uid(),
        date_due: nextDue,
        date_paid: undefined,
        status: "due",
        recurring_next_date: nextOccurrence(nextDue, expense.recurring),
        created_at: now,
        updated_at: now,
      };
      await expensesStore.create(next);
      // Update the current row's projection forward by one cycle so it
      // doesn't immediately offer the same roll again.
      const updated = await expensesStore.update(expense.id, {
        recurring_next_date: nextOccurrence(nextDue, expense.recurring),
        updated_at: now,
      });
      if (updated) setExpense(updated);
      router.push(`/finance/expenses/${next.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Roll-forward failed");
      setRolling(false);
    }
  }

  if (loading) return <div className="h-48 bg-surface rounded-lg border border-border animate-pulse" />;

  if (!expense) {
    return (
      <div className="bg-surface border border-border rounded-lg p-12 text-center">
        <p className="text-sm text-subtle mb-3">Expense not found</p>
        <Link href="/finance/expenses" className="text-sm text-foreground underline">
          Back to expenses
        </Link>
      </div>
    );
  }

  const status = deriveExpenseStatus(expense);
  const badge = STATUS_BADGE[status];

  return (
    <div className="space-y-3">
      <Link
        href="/finance/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to expenses
      </Link>

      {error && (
        <div className="px-4 py-3 bg-danger/10 border border-danger rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      {editing && draft ? (
        <EditExpenseForm
          draft={draft}
          setDraft={setDraft}
          onSave={saveEdit}
          onCancel={cancelEdit}
          saving={saving}
        />
      ) : (
        <>
          {/* Header card: amount is the dominant value */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-semibold text-foreground">
                    {expense.supplier_name}
                  </h2>
                  <span className={`text-2xs uppercase tracking-wider font-medium px-2 py-0.5 rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-2xs text-subtle mt-1">
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                  {expense.recurring ? ` · ${expense.recurring} recurring` : ""} · Due{" "}
                  {fmtDateUK(expense.date_due)}
                </p>
                <div className="mt-4 text-2xl font-semibold tabular-nums tracking-tight leading-none text-foreground">
                  {fmtMoney(expense.amount)}
                </div>
                {expense.vat_included && (
                  <p className="text-2xs text-subtle mt-1.5">
                    incl VAT{expense.vat_amount !== undefined ? ` · ${fmtMoney(expense.vat_amount)}` : ""}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={startEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-xs rounded hover:bg-surface-raised transition-colors"
                >
                  <PencilSquareIcon className="size-4" /> Edit
                </button>
                {expense.recurring && (
                  <button
                    onClick={rollForward}
                    disabled={rolling}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-xs rounded hover:bg-surface-raised disabled:opacity-40 transition-colors"
                  >
                    <ForwardIcon className="size-4" /> {rolling ? "Rolling..." : "Roll forward"}
                  </button>
                )}
                {status !== "paid" && status !== "disputed" && (
                  <button
                    onClick={markPaid}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-xs font-medium rounded hover:opacity-90"
                  >
                    <CheckIcon className="size-4" /> Mark paid
                  </button>
                )}
                {status === "paid" && (
                  <button
                    onClick={markDue}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-xs rounded hover:bg-surface-raised transition-colors"
                  >
                    Mark unpaid
                  </button>
                )}
                {status !== "disputed" && status !== "paid" && (
                  <button
                    onClick={() => changeStatus("disputed")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-warning text-xs rounded hover:bg-surface-raised transition-colors"
                  >
                    Mark disputed
                  </button>
                )}
                {status === "disputed" && (
                  <button
                    onClick={() => changeStatus("due")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-xs rounded hover:bg-surface-raised transition-colors"
                  >
                    Resolve dispute
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-danger text-xs rounded hover:bg-surface-raised transition-colors"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-3">
              <Card title="Amount">
                <KV label="Amount" value={fmtMoney(expense.amount)} />
                <KV label="VAT included" value={expense.vat_included ? "Yes" : "No"} />
                {expense.vat_amount !== undefined && (
                  <KV label="VAT amount" value={fmtMoney(expense.vat_amount)} />
                )}
              </Card>

              {expense.description && (
                <Card title="Description">
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{expense.description}</p>
                </Card>
              )}

              {expense.notes && (
                <Card title="Notes">
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{expense.notes}</p>
                </Card>
              )}

              {expense.file_name && (
                <Card title="Document">
                  <button
                    onClick={openDoc}
                    disabled={openingDoc}
                    className="inline-flex items-center gap-2 text-sm text-foreground underline hover:opacity-80 disabled:opacity-40"
                  >
                    {openingDoc ? (
                      <ArrowPathIcon className="size-4 animate-spin" />
                    ) : (
                      <DocumentIcon className="size-4" />
                    )}{" "}
                    {expense.file_name}
                  </button>
                  <p className="text-2xs text-subtle mt-1">
                    Link signed on click, expires 15min
                  </p>
                </Card>
              )}
            </div>

            <div className="space-y-3">
              <Card title="Status">
                <div>
                  <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-2">
                    Change to
                  </div>
                  <select
                    value={status}
                    onChange={(e) => changeStatus(e.target.value as ExpenseStatus)}
                    className={selectClass}
                  >
                    <option value="due">Due</option>
                    <option value="paid">Paid</option>
                    {status === "overdue" && <option value="overdue">Overdue (auto)</option>}
                    <option value="disputed">Disputed</option>
                  </select>
                </div>
                <KV label="Date due" value={fmtDateUK(expense.date_due)} />
                {expense.date_paid && <KV label="Date paid" value={fmtDateUK(expense.date_paid)} />}
                {expense.disputed_at && (
                  <KV label="Disputed" value={fmtDateUK(expense.disputed_at)} />
                )}
                {expense.disputed_reason && (
                  <div>
                    <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-0.5">
                      Reason
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {expense.disputed_reason}
                    </div>
                  </div>
                )}
              </Card>

              {expense.recurring && (
                <Card title="Recurring">
                  <KV label="Frequency" value={expense.recurring} />
                  {expense.recurring_next_date && (
                    <KV label="Next occurrence" value={fmtDateUK(expense.recurring_next_date)} />
                  )}
                </Card>
              )}

              {expense.legacy_source && (
                <Card title="Migration source">
                  <p className="text-2xs text-subtle">
                    Imported from {expense.legacy_source}
                    {expense.legacy_id ? ` (${expense.legacy_id})` : ""}
                  </p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditExpenseForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: Expense;
  setDraft: (d: Expense) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  function update<K extends keyof Expense>(key: K, value: Expense[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-6">
      <section>
        <h3 className="text-sm font-medium text-foreground mb-4">Edit expense</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Supplier / payee</label>
            <input
              type="text"
              value={draft.supplier_name}
              onChange={(e) => update("supplier_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel}>Category</label>
            <select
              value={draft.category}
              onChange={(e) => update("category", e.target.value as ExpenseCategory)}
              className={selectClass}
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={fieldLabel}>Description</label>
            <input
              type="text"
              value={draft.description || ""}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="pt-6 border-t border-dashed border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">Amount &amp; VAT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Amount (gross, £)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.amount}
              onChange={(e) => update("amount", parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel}>VAT included?</label>
            <label className="inline-flex w-full items-center gap-2 px-3 py-2.5 bg-surface-raised border border-border rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={draft.vat_included}
                onChange={(e) => update("vat_included", e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-muted">Amount includes UK VAT (20%)</span>
            </label>
          </div>
          {draft.vat_included && (
            <div>
              <label className={fieldLabel}>VAT amount (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.vat_amount ?? ""}
                onChange={(e) =>
                  update("vat_amount", e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder={(draft.amount - draft.amount / 1.2).toFixed(2)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </section>

      <section className="pt-6 border-t border-dashed border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">Dates &amp; recurring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={fieldLabel}>Date due</label>
            <input
              type="date"
              value={draft.date_due}
              onChange={(e) => update("date_due", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel}>Date paid</label>
            <input
              type="date"
              value={draft.date_paid || ""}
              onChange={(e) => update("date_paid", e.target.value || undefined)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={fieldLabel}>Recurring</label>
            <select
              value={draft.recurring || ""}
              onChange={(e) =>
                update("recurring", (e.target.value as RecurringFrequency) || undefined)
              }
              className={selectClass}
            >
              <option value="">One-off</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
      </section>

      <section className="pt-6 border-t border-dashed border-border">
        <h3 className="text-sm font-medium text-foreground mb-4">Notes</h3>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className={textareaClass}
        />
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t border-dashed border-border">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs text-subtle hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-foreground text-background text-xs font-medium rounded hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function nextOccurrence(date: string, freq: RecurringFrequency): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  if (freq === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  if (freq === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}
