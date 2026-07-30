/* ── Agreement Checkout: seller details ──
 * Single source of truth for the company block on the invoice AND the signed
 * agreement PDF. EDIT these before sending anything live.
 * (VAT number lives in ./vat and appears automatically once VAT_REGISTERED.)
 */

export const SELLER = {
  name: "Ecom Landers",
  addressLines: ["", ""], // e.g. ["1 Example Street, London", "EC1A 1BB, United Kingdom"]
  email: "hello@ecomlanders.com",
};

// Shared PDF palette (keeps invoice + agreement visually identical).
export const PDF = {
  ink: "#1a1b1e",
  grey: "#6b6b70",
  faint: "#e5e5e7",
  lime: "#CDF93A",
};
