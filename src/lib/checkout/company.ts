/* ── Agreement Checkout: seller details ──
 * Company block on the signed agreement PDF (the invoice reuses the Finance
 * CompanyProfile). VAT number lives in ./vat and shows once VAT_REGISTERED.
 *
 * NOTE: the Keggy retainer showed a Manchester registered office; the invoice
 * (EL-2026-053) shows the Cannock one below. Confirm the correct registered office.
 */

export const SELLER = {
  name: "Ecomlanders Ltd",
  addressLines: ["4 Station Court, Cannock", "England, WS11 0EJ"],
  companyNumber: "16308589",
  email: "hello@ecomlanders.co",
  registeredOffice: "4 Station Court, Cannock, England, WS11 0EJ, United Kingdom",
};

// The agency signatory who pre-signs each agreement before it goes to the client
// (mirrors the Keggy agreement, signed by Ajay before sending).
export const AGENCY_SIGNATORY = {
  name: "AJAY JANI",
  position: "Founder",
  signature: "A.Jani",
};

// Shared PDF palette (keeps invoice + agreement visually identical).
export const PDF = {
  ink: "#1a1b1e",
  grey: "#6b6b70",
  faint: "#e5e5e7",
  lime: "#CDF93A",
};
