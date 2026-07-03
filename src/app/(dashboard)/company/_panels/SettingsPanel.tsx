"use client";

/* ── Company Settings panel ──
 * The company's own identity, brand, and operating calendar. Renders inside
 * the /company TabShell (see layout.tsx), so no page chrome of its own.
 * Deliberately NOT a config dumping ground: delivery timings, audit
 * knowledge, NDAs, and integration toggles live in their own areas now.
 * This surface answers "who is Ecom Landers and how does it operate", the
 * single source contracts / invoices / proposals draw from.
 */

import { useState, useEffect } from "react";
import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type BusinessSettings,
  type CompanyProfile,
} from "@/lib/settings";
import { inputClass } from "@/lib/form-styles";

const FL = "text-2xs uppercase tracking-wider text-subtle font-medium";

const DAY_LABELS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

/* England & Wales bank holidays (substitute days already applied where a
 * holiday falls on a weekend). Extend the list as HMRC publishes new years. */
const ENGLAND_BANK_HOLIDAYS: string[] = [
  // 2026
  "2026-01-01", // New Year's Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-05-04", // Early May bank holiday
  "2026-05-25", // Spring bank holiday
  "2026-08-31", // Summer bank holiday
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (substitute)
  // 2027
  "2027-01-01", // New Year's Day
  "2027-03-26", // Good Friday
  "2027-03-29", // Easter Monday
  "2027-05-03", // Early May bank holiday
  "2027-05-31", // Spring bank holiday
  "2027-08-30", // Summer bank holiday
  "2027-12-27", // Christmas Day (substitute)
  "2027-12-28", // Boxing Day (substitute)
];

const PROFILE_FIELDS: {
  key: keyof CompanyProfile;
  label: string;
  placeholder: string;
  type?: string;
  full?: boolean;
}[] = [
  { key: "legal_name", label: "Legal entity name", placeholder: "Ecom Landers Ltd" },
  { key: "trading_name", label: "Trading name", placeholder: "Ecom Landers" },
  { key: "company_number", label: "Company number", placeholder: "12345678" },
  { key: "vat_number", label: "VAT number", placeholder: "GB123456789" },
  { key: "contact_email", label: "Contact email", placeholder: "hello@ecomlanders.com", type: "email" },
  { key: "contact_phone", label: "Contact phone", placeholder: "+44 7000 000000" },
  { key: "website", label: "Website", placeholder: "https://ecomlanders.com", full: true },
  { key: "registered_address", label: "Registered address", placeholder: "Street, city, postcode", full: true },
  { key: "trading_address", label: "Trading address (if different)", placeholder: "Street, city, postcode", full: true },
];

export default function SettingsPanel() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newHoliday, setNewHoliday] = useState("");

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = (patch: Partial<BusinessSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };

  const company = settings.company ?? DEFAULT_SETTINGS.company!;
  const brand = settings.brand ?? DEFAULT_SETTINGS.brand!;
  const workingDays = settings.workingDays ?? DEFAULT_SETTINGS.workingDays;
  const holidays = [...(settings.publicHolidays ?? [])].sort();

  const updateCompany = (key: keyof CompanyProfile, value: string) =>
    update({ company: { ...company, [key]: value } });

  const toggleDay = (key: keyof BusinessSettings["workingDays"]) =>
    update({ workingDays: { ...workingDays, [key]: !workingDays[key] } });

  const addHoliday = () => {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    update({ publicHolidays: [...holidays, newHoliday] });
    setNewHoliday("");
  };
  const removeHoliday = (d: string) => update({ publicHolidays: holidays.filter((h) => h !== d) });

  const addBankHolidays = () => {
    const merged = Array.from(new Set([...holidays, ...ENGLAND_BANK_HOLIDAYS])).sort();
    update({ publicHolidays: merged });
  };
  const allBankHolidaysPresent = ENGLAND_BANK_HOLIDAYS.every((d) => holidays.includes(d));

  const handleSave = async () => {
    await saveSettings(settings);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-2xs text-subtle mt-0.5">
            Company identity, brand, and operating calendar. The single source contracts, invoices,
            and proposals draw from.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty && !saved}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded border border-border bg-surface text-sm text-foreground hover:bg-surface-raised disabled:opacity-40 disabled:hover:bg-surface transition-colors shrink-0"
        >
          {saved ? (
            <>
              <CheckIcon className="size-4" />
              Saved
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>

      {/* Company profile */}
      <section className="bg-surface border border-border-faint rounded p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Company profile</h2>
          <p className="text-2xs text-subtle mt-0.5">Legal and contact details for the business.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROFILE_FIELDS.map((f) => (
            <label key={f.key} className={`block space-y-1.5 ${f.full ? "md:col-span-2" : ""}`}>
              <span className={FL}>{f.label}</span>
              <input
                type={f.type ?? "text"}
                value={company[f.key] ?? ""}
                onChange={(e) => updateCompany(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Brand */}
      <section className="bg-surface border border-border-faint rounded p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">Brand</h2>
          <p className="text-2xs text-subtle mt-0.5">
            Logo and accent used across client portals and proposals.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className={FL}>Logo URL</span>
            <input
              value={brand.logo_url}
              onChange={(e) => update({ brand: { ...brand, logo_url: e.target.value } })}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={FL}>Brand colour</span>
            <div className="flex items-center gap-2">
              <input
                value={brand.brand_color}
                onChange={(e) => update({ brand: { ...brand, brand_color: e.target.value } })}
                placeholder="#CDF93A"
                className={inputClass}
              />
              <span
                className="size-9 rounded border border-border shrink-0"
                style={{ background: brand.brand_color || "transparent" }}
              />
            </div>
          </label>
        </div>
        {brand.logo_url && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-2xs text-subtle">Preview</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo_url} alt="Logo preview" className="h-8 max-w-[160px] object-contain" />
          </div>
        )}
      </section>

      {/* Operating calendar */}
      <section className="bg-surface border border-border-faint rounded p-5 space-y-5">
        <div>
          <h2 className="text-sm font-medium text-foreground">Operating calendar</h2>
          <p className="text-2xs text-subtle mt-0.5">
            Working days and public holidays. Deadlines and turnarounds skip anything not marked
            working.
          </p>
        </div>

        {/* Working days */}
        <div className="space-y-2">
          <span className={FL}>Working days</span>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map(({ key, label }) => {
              const on = workingDays[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleDay(key)}
                  className={`h-9 min-w-[52px] px-3 rounded border text-sm transition-colors ${
                    on
                      ? "bg-surface-raised border-border text-foreground font-medium"
                      : "bg-surface border-border-faint text-subtle hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Public holidays */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className={FL}>Public holidays</span>
            <button
              onClick={addBankHolidays}
              disabled={allBankHolidaysPresent}
              className="text-2xs text-muted hover:text-foreground disabled:opacity-40 disabled:hover:text-muted transition-colors"
            >
              {allBankHolidaysPresent ? "England & Wales added" : "Add England & Wales bank holidays"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
              className={`${inputClass} md:max-w-[220px]`}
            />
            <button
              onClick={addHoliday}
              disabled={!newHoliday}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-surface text-sm text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-40 transition-colors shrink-0"
            >
              <PlusIcon className="size-4" />
              Add
            </button>
          </div>
          {holidays.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {holidays.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded border border-border bg-surface-raised text-xs text-muted"
                >
                  {fmtDate(d)}
                  <button
                    onClick={() => removeHoliday(d)}
                    className="text-subtle hover:text-foreground transition-colors"
                    aria-label={`Remove ${d}`}
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-2xs text-subtle pt-1">No public holidays added.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function fmtDate(d: string): string {
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
