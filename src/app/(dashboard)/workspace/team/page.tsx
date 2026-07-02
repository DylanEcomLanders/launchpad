"use client";

// Admin-only "Team access" screen: invite people to the per-person login
// allowlist, see who's signed in, link each account to a pod member, and
// revoke / restore access. Backed by the app_users table (migration 024).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRole, useCurrentUser } from "@/components/auth-gate";
import { useWorkspaceData } from "@/lib/workspace/use-workspace-data";
import { buildMemberMap } from "@/lib/workspace/derive";
import {
  listAppUsers,
  inviteAppUser,
  setAppUserActive,
  setAppUserRole,
  type AppUser,
  type AppUserRole,
} from "@/lib/auth/app-users";
import { ROLE_LABEL } from "@/lib/pods-v2/types";
import {
  Card,
  Pill,
  SectionTitle,
  EmptyState,
} from "@/lib/workspace/ui";

/* Member-facing labels. "team" reads as "Member" in the UI so it
 * matches how the founder thinks about it (member vs admin). */
const ROLE_LABEL_UI: Record<AppUserRole, string> = {
  admin: "Admin",
  cro: "CRO",
  team: "Member",
};

export default function WorkspaceTeamAccess() {
  const role = useRole();
  const me = useCurrentUser();
  const data = useWorkspaceData();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Invite form.
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppUserRole>("team");
  const [podMemberId, setPodMemberId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const memberMap = useMemo(() => buildMemberMap(data.pods), [data.pods]);
  // Every selectable pod member (non-placeholder), for linking an account.
  const members = useMemo(
    () =>
      data.pods
        .flatMap((p) => p.members.map((m) => ({ ...m, podName: p.name })))
        .filter((m) => !m.is_placeholder),
    [data.pods],
  );

  async function refresh() {
    const list = await listAppUsers();
    setUsers(list);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setBusy(true);
    setNotice(null);
    const created = await inviteAppUser({
      email,
      name,
      role: inviteRole,
      pod_member_id: podMemberId || null,
      invited_by: me?.name ?? "admin",
    });
    setBusy(false);
    if (created) {
      setNotice(`${created.name} can now sign in with ${created.email}.`);
      setEmail("");
      setName("");
      setInviteRole("team");
      setPodMemberId("");
      refresh();
    } else {
      setNotice("Couldn't add that person — they may already be on the list.");
    }
  }

  async function toggleActive(u: AppUser) {
    setBusy(true);
    await setAppUserActive(u.id, !u.active);
    await refresh();
    setBusy(false);
  }

  async function changeRole(u: AppUser, role: AppUserRole) {
    if (role === u.role) return;
    setBusy(true);
    /* Optimistic — flip locally so the dropdown reflects the choice
     * immediately, then confirm against the server. */
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    const ok = await setAppUserRole(u.id, role);
    if (ok) {
      setNotice(
        `${u.name} is now ${ROLE_LABEL_UI[role]}. They'll get the new access next time they sign in.`,
      );
    } else {
      setNotice(`Couldn't change ${u.name}'s role — try again.`);
    }
    await refresh();
    setBusy(false);
  }

  // Admin-only screen.
  if (role !== "admin") {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState>Team access management is admin-only.</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BackLink />

      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Team access
        </h1>
        <p className="mt-1 text-sm text-muted">
          Invite people to sign in with their own email. Only listed emails can
          get a magic link, and every action they take is logged under their name.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* People list */}
        <section>
          <SectionTitle
            action={<span className="text-xs text-subtle">{users.length}</span>}
          >
            People
          </SectionTitle>
          <Card className="divide-y divide-border">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-subtle">Loading…</div>
            ) : users.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-subtle">
                No one invited yet.
              </div>
            ) : (
              users.map((u) => {
                const linked = u.pod_member_id ? memberMap.get(u.pod_member_id) : null;
                return (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${u.active ? "text-foreground" : "text-subtle line-through"}`}>
                          {u.name}
                        </span>
                        {u.auth_id ? (
                          <Pill tone="green">Signed in</Pill>
                        ) : (
                          <Pill tone="amber">Invited</Pill>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-subtle">
                        {u.email}
                        {linked && ` · ${linked.name} (${linked.podName})`}
                      </div>
                    </div>
                    {/* Access level — change inline. Member = team role
                        (My Tasks + Delivery + tools). Admin = everything. */}
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as AppUserRole)}
                      disabled={busy}
                      className="shrink-0 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-foreground outline-none focus:border-border disabled:opacity-50"
                      title="Access level"
                    >
                      <option value="team">Member</option>
                      <option value="cro">CRO</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={busy}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.active
                          ? "text-subtle hover:text-danger"
                          : "text-success hover:text-success"
                      }`}
                    >
                      {u.active ? "Revoke" : "Restore"}
                    </button>
                  </div>
                );
              })
            )}
          </Card>
        </section>

        {/* Invite form */}
        <aside>
          <SectionTitle>Invite someone</SectionTitle>
          <Card className="p-5">
            <form onSubmit={submitInvite} className="space-y-3">
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                />
              </Field>
              <Field label="Work email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@ecomlanders.com"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                />
              </Field>
              <Field label="Role">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppUserRole)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                >
                  <option value="team">Team</option>
                  <option value="cro">CRO</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Link to pod member (optional)">
                <select
                  value={podMemberId}
                  onChange={(e) => setPodMemberId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-border"
                >
                  <option value="">Not a pod member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.podName} · {ROLE_LABEL[m.role]}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {busy ? "Adding…" : "Add to team"}
              </button>
              {notice && <p className="text-xs text-muted">{notice}</p>}
            </form>
          </Card>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-subtle">
            They&apos;ll sign in at the login screen by entering this email and
            clicking the link we send them. No password to share.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function BackLink() {
  return (
    <Link
      href="/workspace"
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
    >
      ← Workspace
    </Link>
  );
}
