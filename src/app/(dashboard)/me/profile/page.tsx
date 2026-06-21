"use client";

/* ── /me/profile - team member read-only view ──
 *
 * Slim view of the user's own Person record. No admin chrome, no
 * edit affordances. Surfaces what they care about: identity, role,
 * comp, status, key dates.
 *
 * Access: routed through AuthGate, so any signed-in role can reach.
 * Resolves the signed-in user to a Person via app_users link.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/components/auth-gate";
import { peopleStore, fmtDateUK, fmtMoney } from "@/lib/company/data";
import type { Person } from "@/lib/company/types";
import { STATUS_BADGE, initials, deptColor } from "@/lib/company/ui";

export default function MyProfilePage() {
  const me = useCurrentUser();
  const [person, setPerson] = useState<Person | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    peopleStore.getAll().then((all) => {
      const meEmail = me?.email?.trim().toLowerCase();
      const matched =
        all.find((p) => p.pod_member_id === me?.pod_member_id) ||
        (meEmail
          ? all.find((p) => p.email?.trim().toLowerCase() === meEmail)
          : null) ||
        null;
      setPerson(matched);
      setHydrated(true);
    });
  }, [me]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
        <div className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="text-sm text-[#71757D]">
            Your account isn&apos;t linked to a team member record yet.
          </p>
          <Link
            href="/me"
            className="inline-block mt-4 text-xs text-[#E5E5EA] hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_BADGE[person.status];

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA] mb-6"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Link>

        <div className="flex items-center gap-4 mb-8">
          {person.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatar_url}
              alt={person.full_name}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="size-16 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ background: deptColor(person.department) }}
            >
              {initials(person.full_name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {person.preferred_name || person.full_name}
            </h1>
            <div className="text-sm text-[#71757D] mt-0.5">
              {person.job_title || ""}{" "}
              {person.department && (
                <>· {person.department}</>
              )}
            </div>
          </div>
          <span
            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shrink-0"
            style={{ background: status.bg, color: status.text }}
          >
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReadCard label="Engagement">
            <Row k="Type" v={person.employment_type === "employee" ? "Employee" : "Contractor"} />
            <Row k="Started" v={person.start_date ? fmtDateUK(person.start_date) : "—"} />
            {person.engagement_type && (
              <Row
                k="Scheme"
                v={
                  person.engagement_type === "core_retainer"
                    ? "Core retainer"
                    : person.engagement_type === "contractor_retainer"
                    ? "Contractor on retainer"
                    : "Contractor per-page"
                }
              />
            )}
          </ReadCard>

          <ReadCard label="Compensation">
            {person.compensation_amount != null ? (
              <>
                <Row
                  k="Rate"
                  v={`${fmtMoney(person.compensation_amount, person.compensation_currency || "GBP")} / ${
                    person.payment_frequency === "per_invoice"
                      ? "invoice"
                      : person.payment_frequency || "month"
                  }`}
                />
                <Row k="Method" v={person.payment_method === "bank_transfer" ? "Bank transfer" : person.payment_method === "wise" ? "Wise" : person.payment_method || "—"} />
              </>
            ) : (
              <p className="text-xs text-[#71757D]">Not set yet.</p>
            )}
          </ReadCard>

          <ReadCard label="Contact">
            <Row k="Email" v={person.email || "—"} />
            <Row k="Phone" v={person.phone || "—"} />
            <Row k="Location" v={person.location || "—"} />
          </ReadCard>

          <ReadCard label="Notes">
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              {person.notes ||
                "Nothing here. Reach out to an admin to add or correct anything."}
            </p>
          </ReadCard>
        </div>

        <p className="mt-6 text-xs text-[#71757D]">
          Edits to your profile are admin-only. Ask in #team-admin if anything
          looks off.
        </p>
      </div>
    </div>
  );
}

function ReadCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3">
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-[#71757D] text-xs">{k}</span>
      <span className="text-[#E5E5EA] truncate text-right">{v}</span>
    </div>
  );
}
