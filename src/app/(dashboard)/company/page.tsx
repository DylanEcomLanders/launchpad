"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UserGroupIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  peopleStore,
  invoicesStore,
  candidatesStore,
  openRolesStore,
  fmtDateUK,
  fmtMoney,
  deriveInvoiceStatus,
} from "@/lib/company/data";
import {
  type Person,
  type Invoice,
  type Candidate,
  type OpenRole,
} from "@/lib/company/types";

interface ActivityEvent {
  id: string;
  ts: string;
  text: string;
  href?: string;
}

export default function CompanyOverview() {
  const [people, setPeople] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      peopleStore.getAll(),
      invoicesStore.getAll(),
      candidatesStore.getAll(),
      openRolesStore.getAll(),
    ]).then(([p, i, c, r]) => {
      setPeople(p);
      setInvoices(i);
      setCandidates(c);
      setRoles(r);
      setHydrated(true);
    });
  }, []);

  const stats = useMemo(() => {
    const active = people.filter((p) => p.status === "active");
    const employees = active.filter((p) => p.employment_type === "employee").length;
    const contractors = active.filter((p) => p.employment_type === "contractor").length;
    const openRoleCount = roles.filter((r) => r.status === "open").length;
    const activeCandidates = candidates.filter((c) => c.status !== "rejected" && c.status !== "hired").length;
    const enriched = invoices.map((i) => ({ ...i, status: deriveInvoiceStatus(i) }));
    const outstanding = enriched.filter((i) => i.status === "pending" || i.status === "overdue");
    const overdueCount = enriched.filter((i) => i.status === "overdue").length;
    const outstandingTotal = outstanding.reduce((s, i) => s + i.amount, 0);
    return {
      headcount: active.length,
      employees,
      contractors,
      openRoleCount,
      activeCandidates,
      outstandingTotal,
      overdueCount,
    };
  }, [people, invoices, candidates, roles]);

  const activity = useMemo<ActivityEvent[]>(() => {
    const evs: ActivityEvent[] = [];
    people.forEach((p) =>
      evs.push({
        id: `p-${p.id}`,
        ts: p.created_at,
        text: `New person added: ${p.full_name}`,
        href: `/company/people/${p.id}`,
      }),
    );
    invoices.forEach((i) => {
      evs.push({
        id: `i-${i.id}`,
        ts: i.created_at,
        text: `Invoice from ${i.supplier_name} for ${fmtMoney(i.amount, i.currency)}`,
        href: `/company/invoices/${i.id}`,
      });
      if (i.paid_date) {
        evs.push({
          id: `ip-${i.id}`,
          ts: i.paid_date,
          text: `Invoice marked paid: ${i.supplier_name}`,
          href: `/company/invoices/${i.id}`,
        });
      }
    });
    candidates.forEach((c) =>
      evs.push({
        id: `c-${c.id}`,
        ts: c.updated_at,
        text: `Candidate ${c.full_name} → ${c.status}`,
        href: `/company/hiring`,
      }),
    );
    return evs.sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10);
  }, [people, invoices, candidates]);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#F7F8FA] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={UserGroupIcon}
          label="Headcount"
          value={stats.headcount}
          sub={`${stats.employees} employees · ${stats.contractors} contractors`}
          href="/company/people"
        />
        <StatCard
          icon={BriefcaseIcon}
          label="Hiring"
          value={stats.openRoleCount}
          sub={`${stats.activeCandidates} active candidates`}
          href="/company/hiring"
        />
        <StatCard
          icon={DocumentTextIcon}
          label="Outstanding"
          value={fmtMoney(stats.outstandingTotal)}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "All up to date"}
          accent={stats.overdueCount > 0 ? "red" : undefined}
          href="/company/invoices"
        />
        <StatCard
          icon={Squares2X2Icon}
          label="Org structure"
          value={stats.headcount}
          sub="View chart →"
          href="/company/structure"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <div className="text-xs text-[#7A7A7A] py-2">
              No activity yet. Add people, candidates, or invoices to see them here.
            </div>
          ) : (
            <ul className="space-y-2">
              {activity.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    {e.href ? (
                      <Link href={e.href} className="text-[#1B1B1B] hover:underline">
                        {e.text}
                      </Link>
                    ) : (
                      <span className="text-[#1B1B1B]">{e.text}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#7A7A7A] whitespace-nowrap">{fmtDateUK(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Jump to
          </h2>
          <div className="space-y-2">
            <QuickLink href="/company/people" label="People" />
            <QuickLink href="/company/structure" label="Org structure" />
            <QuickLink href="/company/invoices" label="Invoices" />
            <QuickLink href="/company/hiring" label="Hiring" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  accent,
}: {
  icon: typeof UserGroupIcon;
  label: string;
  value: number | string;
  sub?: string;
  href: string;
  accent?: "red";
}) {
  return (
    <Link
      href={href}
      className="block bg-white border border-[#E5E5EA] rounded-xl p-5 hover:border-[#1B1B1B] transition-colors shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2 text-[#7A7A7A] mb-2">
        <Icon className="size-4" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${accent === "red" ? "text-[#B91C1C]" : "text-[#1B1B1B]"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#7A7A7A] mt-1">{sub}</div>}
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between text-sm text-[#1B1B1B] hover:bg-[#F7F8FA] rounded-lg px-3 py-2"
    >
      {label}
      <ArrowRightIcon className="size-3.5 text-[#7A7A7A]" />
    </Link>
  );
}
