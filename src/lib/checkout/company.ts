/* ── Agreement Checkout: seller details ──
 * Company block on the signed agreement PDF (the invoice reuses the Finance
 * CompanyProfile). VAT number lives in ./vat and shows once VAT_REGISTERED.
 *
 * Registered office is Manchester (moved from the old Cannock address).
 */

export const SELLER = {
  name: "Ecomlanders Ltd",
  addressLines: ["Gateway House, Suite 3.5", "Manchester, M22 5WY"],
  companyNumber: "16308589",
  email: "hello@ecomlanders.co",
  registeredOffice: "Gateway House, Suite 3.5, Manchester, M22 5WY, United Kingdom",
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
