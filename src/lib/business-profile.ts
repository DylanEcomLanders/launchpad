/**
 * Ecomlanders business profile — sender details for invoices, agreements,
 * and any other client-facing documents we generate.
 *
 * Update here once and it propagates everywhere.
 */
export const businessProfile = {
  legalName: "Ecomlanders Ltd",
  addressLines: ["4 Station Court", "Cannock", "England", "WS11 0EJ"],
  companyNumber: "16308589",
  vatNumber: null as string | null, // Not VAT registered
  email: "" as string,
  website: "" as string,
};

export type BusinessProfile = typeof businessProfile;
