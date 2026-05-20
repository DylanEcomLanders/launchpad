/* ── Company profile loader ──
 * Single-row store. Loads from Supabase if present, otherwise seeds
 * from the legacy hardcoded businessProfile so existing invoices still
 * render the right sender details until the user edits via /finance/settings.
 */

import { companyProfileStore, nowISO } from "./data";
import { businessProfile } from "@/lib/business-profile";
import type { CompanyProfile } from "./types";

export const PROFILE_ID = "default";

let cached: CompanyProfile | null = null;

export function seededProfile(): CompanyProfile {
  return {
    id: PROFILE_ID,
    legal_name: businessProfile.legalName,
    address_lines: [...businessProfile.addressLines],
    company_number: businessProfile.companyNumber,
    vat_number: businessProfile.vatNumber,
    vat_registered: !!businessProfile.vatNumber,
    email: businessProfile.email || undefined,
    website: businessProfile.website || undefined,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export async function loadCompanyProfile(): Promise<CompanyProfile> {
  if (cached) return cached;
  const existing = await companyProfileStore.getById(PROFILE_ID);
  if (existing) {
    cached = existing;
    return existing;
  }
  const seeded = seededProfile();
  await companyProfileStore.create(seeded);
  cached = seeded;
  return seeded;
}

export async function saveCompanyProfile(
  updates: Partial<CompanyProfile>,
): Promise<CompanyProfile> {
  const existing = (await companyProfileStore.getById(PROFILE_ID)) ?? seededProfile();
  const merged: CompanyProfile = {
    ...existing,
    ...updates,
    id: PROFILE_ID,
    updated_at: nowISO(),
  };
  if (await companyProfileStore.getById(PROFILE_ID)) {
    await companyProfileStore.update(PROFILE_ID, merged);
  } else {
    await companyProfileStore.create(merged);
  }
  cached = merged;
  return merged;
}

export function invalidateProfileCache(): void {
  cached = null;
}
