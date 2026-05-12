"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { BUCKETS, type BucketSize, type EngagementKind } from "@/lib/engagement-template";
import type { MockEngagement } from "@/lib/engagement-mocks";
import { saveLocalEngagement } from "@/lib/engagement-storage";
import { createClient as createPodsClient, getPods } from "@/lib/pods-v2/data";
import type { RetainerTier } from "@/lib/pods-v2/types";

function todayMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function uid(): string {
  return `eng-${Math.random().toString(36).slice(2, 10)}`;
}

type KindChoice = "retainer" | "A" | "B" | "C" | "Bespoke";

export default function NewEngagementPage() {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [vertical, setVertical] = useState("");
  const [kindChoice, setKindChoice] = useState<KindChoice>("retainer");
  const [podNumber, setPodNumber] = useState<number>(1);
  const [value, setValue] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [timezone, setTimezone] = useState("");
  const [startDate, setStartDate] = useState(todayMonday());
  const [submitting, setSubmitting] = useState(false);

  const isRetainer = kindChoice === "retainer";
  const valid = brand.trim().length > 0 && vertical.trim().length > 0 && value.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);

    const kind: EngagementKind = isRetainer ? "retainer" : "bucket";
    const bucket: BucketSize | undefined = isRetainer ? undefined : (kindChoice as BucketSize);

    /* Resolve the chosen Pod number → actual pods-v2 Pod.id (UUID) so the
     * Client row is wired to the correct pod for capacity tracking. */
    const podRow = getPods().find((p) => p.name === `Pod ${podNumber}`);

    /* Translate the form's value field → pods-v2 RetainerTier. */
    const tier: RetainerTier = !isRetainer
      ? "none"
      : value.trim().match(/12/)
        ? "12k"
        : "8k";

    let id: string;
    if (podRow) {
      /* Create the pods-v2 Client row first — that becomes the canonical
       * record. The Client appears on the pod board AND on /engagements
       * via the bridge. */
      const client = createPodsClient({
        name: brand.trim(),
        pod_id: podRow.id,
        brand_warm: false,
        retainer_tier: tier,
        kickoff_date: startDate,
        brief: {
          websiteUrl: websiteUrl.trim() || undefined,
          primaryContact: primaryContact.trim() || undefined,
          timezone: timezone.trim() || undefined,
        },
      });
      id = client.id;
    } else {
      /* Pods-v2 not seeded — fall back to localStorage-only engagement. */
      id = uid();
      const eng: MockEngagement = {
        id,
        brand: brand.trim(),
        vertical: vertical.trim(),
        retainer: isRetainer ? value.trim() : "Project",
        anchor: isRetainer ? "" : `Bucket ${bucket}`,
        startDate,
        currentDay: 1,
        podNumber,
        kind,
        bucket,
        brief: {
          websiteUrl: websiteUrl.trim() || undefined,
          primaryContact: primaryContact.trim() || undefined,
          timezone: timezone.trim() || undefined,
        },
        customDeliverables: [],
        deliverables: [],
        assets: [],
        activity: [
          {
            id: `act-${Date.now()}`,
            day: 1,
            actor: "You",
            action: "Client created",
          },
        ],
      };
      saveLocalEngagement(eng);
    }
    router.push(`/engagements/${id}`);
  };

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <Link
        href="/engagements"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#666] hover:text-[#1B1B1B] mb-4"
      >
        <ArrowLeftIcon className="size-3" />
        All clients
      </Link>

      <header className="mb-6 border-b border-[#E5E5EA] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
          Internal · Delivery
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B] mt-1">
          New client
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Spin up a client space. Brief details get filled in once the onboarding form lands.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Kind selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-2">
            Type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {([
              { id: "retainer", label: "CE Retainer", sub: "3 months" },
              { id: "A", label: "Bucket A", sub: "10 wd" },
              { id: "B", label: "Bucket B", sub: "15 wd" },
              { id: "C", label: "Bucket C", sub: "20 wd" },
              { id: "Bespoke", label: "Bespoke", sub: "Custom" },
            ] as { id: KindChoice; label: string; sub: string }[]).map((opt) => {
              const active = kindChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setKindChoice(opt.id)}
                  className={`text-left rounded-lg border p-2.5 transition-all ${
                    active
                      ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                      : "border-[#E5E5EA] bg-white text-[#1B1B1B] hover:border-[#1B1B1B]"
                  }`}
                >
                  <p className="text-[12px] font-semibold tracking-tight">{opt.label}</p>
                  <p className={`text-[10px] ${active ? "text-white/70" : "text-[#999]"}`}>{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Brand"
            value={brand}
            onChange={setBrand}
            placeholder="e.g. Northern Roots Coffee"
            required
          />
          <Field
            label="Vertical"
            value={vertical}
            onChange={setVertical}
            placeholder="e.g. Speciality coffee · DTC"
            required
          />
          <Field
            label={isRetainer ? "Retainer value (£/mo)" : "Project value (£)"}
            value={value}
            onChange={setValue}
            placeholder={isRetainer ? "£15K" : "£3.5K"}
            required
          />
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">
              Pod
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPodNumber(n)}
                  className={`flex-1 py-2 text-[12px] font-semibold rounded-md border transition-all ${
                    podNumber === n
                      ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                      : "border-[#E5E5EA] bg-white text-[#1B1B1B] hover:border-[#1B1B1B]"
                  }`}
                >
                  Pod {n}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Primary contact"
            value={primaryContact}
            onChange={setPrimaryContact}
            placeholder="Name · email (optional)"
          />
          <Field
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
            placeholder="e.g. GMT (London)"
          />
          <Field
            label="Website URL"
            value={websiteUrl}
            onChange={setWebsiteUrl}
            placeholder="https://..."
          />
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">
              Kickoff date (Monday)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-[#E5E5EA]">
          <button
            type="submit"
            disabled={!valid || submitting}
            className="text-[12px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create client"}
          </button>
          <Link
            href="/engagements"
            className="text-[12px] font-medium text-[#666] hover:text-[#1B1B1B] px-3 py-2"
          >
            Cancel
          </Link>
          <p className="text-[11px] text-[#999] ml-auto">
            Saved to localStorage until Supabase is wired
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">
        {label} {required && <span className="text-[#C62828] normal-case">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B]"
      />
    </div>
  );
}
