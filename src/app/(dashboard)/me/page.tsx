"use client";

/* ── /me — team member landing ──
 *
 * Where team members (auth role = "team") land after sign-in. Shows
 * the contract sign nudge at the top if they have an unsigned
 * contract, then a small hub of cards pointing at their tasks,
 * invoice submission, and profile.
 *
 * Admin and CRO can also visit, but they'll mostly land on /company
 * (Inbox) by default.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ListBulletIcon,
  DocumentTextIcon,
  UserIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/components/auth-gate";
import { peopleStore } from "@/lib/company/data";
import { agreementStore } from "@/lib/agreements/data";
import type { Person } from "@/lib/company/types";
import type { Agreement } from "@/lib/agreements/types";

export default function MeLanding() {
  const me = useCurrentUser();
  const [person, setPerson] = useState<Person | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* Resolve the signed-in person from app_users.pod_member_id, then
     * find their HR record via the Person.pod_member_id bridge. If
     * the bridge isn't set yet, fall back to email match. */
    let cancelled = false;
    async function load() {
      const [people, allAgr] = await Promise.all([
        peopleStore.getAll(),
        agreementStore.getAll(),
      ]);
      if (cancelled) return;
      const meEmail = me?.email?.trim().toLowerCase();
      const matched =
        people.find((p) => p.pod_member_id === me?.pod_member_id) ||
        (meEmail
          ? people.find(
              (p) => p.email?.trim().toLowerCase() === meEmail,
            )
          : null) ||
        null;
      setPerson(matched);
      setAgreements(
        matched ? allAgr.filter((a) => a.person_id === matched.id) : [],
      );
      setHydrated(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [me]);

  const unsignedContract = useMemo(
    () =>
      agreements.find(
        (a) => a.kind === "contract" && (a.status === "sent" || a.status === "draft"),
      ),
    [agreements],
  );

  const firstName =
    person?.preferred_name || me?.name?.split(/\s+/)[0] || person?.full_name?.split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
          Your space
        </p>
        <h1 className="mt-2 text-[28px] leading-tight">
          <span className="font-bold">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </span>{" "}
          <span className="font-normal text-[#71757D]">
            here&apos;s where to go
          </span>
        </h1>

        {hydrated && unsignedContract && (
          <Link
            href={`/portal/agreement/${unsignedContract.id}`}
            className="group mt-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10"
          >
            <ShieldCheckIcon className="size-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#E5E5EA]">
                Sign your contract
              </div>
              <div className="mt-0.5 text-[12px] text-[#9CA3AF]">
                Your Ecom Landers engagement agreement is ready for your
                signature. Quick review + sign.
              </div>
            </div>
            <span className="self-center text-[11px] font-semibold uppercase tracking-wider text-amber-300 group-hover:text-amber-200 shrink-0">
              Open →
            </span>
          </Link>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          <HubCard
            href="/my-work"
            icon={ListBulletIcon}
            label="My tasks"
            sub="What's assigned to you across every client"
          />
          <HubCard
            href="/me/invoices"
            icon={DocumentTextIcon}
            label="Submit an invoice"
            sub="Upload an invoice, auto-attached to your account"
          />
          <HubCard
            href="/me/profile"
            icon={UserIcon}
            label="My profile"
            sub="Comp, role, key dates"
          />
          <ChangePasswordCard email={me?.email} />
        </div>

        {hydrated && !person && (
          <p className="text-xs text-[#71757D] mt-8 leading-relaxed">
            Your account isn&apos;t linked to a team member record yet. Ask an
            admin to link your email to a Person on the Admin people list.
          </p>
        )}
      </div>
    </div>
  );
}

/* Change password card sits alongside the hub cards. Clicking fires
 * resetPasswordForEmail with a redirect to /login/reset-password so
 * the user picks up the email link, sets a new password, and bounces
 * back to the app. Slimmer + reuses the existing reset flow. */
function ChangePasswordCard({ email }: { email?: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function send() {
    if (!email) {
      setErr("Your email isn't on your account yet.");
      setState("error");
      return;
    }
    setState("sending");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login/reset-password",
      });
      if (error) throw error;
      setState("sent");
    } catch (e) {
      console.error("[me] change password failed:", e);
      setErr(e instanceof Error ? e.message : "Couldn't send.");
      setState("error");
    }
  }

  return (
    <button
      onClick={send}
      disabled={state === "sending"}
      className="text-left bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 hover:border-white transition-colors disabled:opacity-60"
    >
      <div className="flex items-center gap-2 text-[#71757D]">
        <LockClosedIcon className="size-4" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          Change password
        </span>
      </div>
      <div className="mt-2 text-sm text-[#E5E5EA]">
        {state === "sent"
          ? "Reset link sent. Check your email."
          : state === "error"
          ? err || "Something went wrong."
          : state === "sending"
          ? "Sending..."
          : "Email me a reset link"}
      </div>
    </button>
  );
}

function HubCard({
  href,
  icon: Icon,
  label,
  sub,
  disabled,
}: {
  href: string;
  icon: typeof ListBulletIcon;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[#71757D]">
        <Icon className="size-4" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </span>
        {disabled && (
          <span className="text-[9px] uppercase tracking-wider text-[#71757D] ml-auto">
            Soon
          </span>
        )}
      </div>
      <div className="mt-2 text-sm text-[#E5E5EA]">{sub}</div>
    </>
  );

  if (disabled) {
    return (
      <div className="block bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 opacity-60 cursor-not-allowed">
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="block bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 hover:border-white transition-colors"
    >
      {inner}
    </Link>
  );
}
