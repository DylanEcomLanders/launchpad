/* ── Invoice deliverable catalogue ──
 * Quick-add price list used by the receivables form. Lifted from the
 * legacy /tools/invoice-generator. Edit here once.
 */

export interface InvoiceDeliverable {
  name: string;
  category: string;
  price: number;
}

export const invoiceDeliverables: InvoiceDeliverable[] = [
  /* Page Builds */
  { name: "1 Page Build", category: "Page Builds", price: 3000 },
  { name: "2 Page Build", category: "Page Builds", price: 5500 },
  { name: "3 Page Build", category: "Page Builds", price: 8000 },
  { name: "4 Page Build", category: "Page Builds", price: 10000 },
  { name: "Single Advertorial / Listicle", category: "Page Builds", price: 2000 },
  { name: "Advertorial / Listicle Bundle x2", category: "Page Builds", price: 3500 },
  /* Secondary Pages */
  { name: "Collection Page", category: "Secondary Pages", price: 750 },
  { name: "Account Page", category: "Secondary Pages", price: 750 },
  { name: "About Us Page", category: "Secondary Pages", price: 750 },
  /* Tertiary Pages */
  { name: "FAQ Page", category: "Tertiary Pages", price: 500 },
  { name: "Contact Page", category: "Tertiary Pages", price: 500 },
  { name: "Cart Page", category: "Tertiary Pages", price: 500 },
  { name: "Navigation", category: "Tertiary Pages", price: 500 },
  { name: "Policy Pages (All)", category: "Tertiary Pages", price: 500 },
  /* Additional Services */
  { name: "5 Static Ads", category: "Additional Services", price: 500 },
  { name: "10 Static Ads", category: "Additional Services", price: 850 },
  { name: "10 Email Designs", category: "Additional Services", price: 750 },
  { name: "20 Email Designs", category: "Additional Services", price: 1500 },
  { name: "Extended 30 Day Support", category: "Additional Services", price: 1000 },
  { name: "Extended 14 Day Support", category: "Additional Services", price: 500 },
  { name: "Full Email Flow Design", category: "Additional Services", price: 2500 },
  { name: "Brand Refresh", category: "Additional Services", price: 500 },
  { name: "24hr Turnaround", category: "Additional Services", price: 2000 },
  { name: "48hr Turnaround", category: "Additional Services", price: 1000 },
  { name: "A/B Test Setup + Monitor", category: "Additional Services", price: 500 },
  { name: "Page Variant / Reskin", category: "Additional Services", price: 1000 },
  { name: "Cart / Post Purchase", category: "Additional Services", price: 500 },
  { name: "Full Brand Refresh", category: "Additional Services", price: 2500 },
];

export const deliverableCategories = [
  "Page Builds",
  "Secondary Pages",
  "Tertiary Pages",
  "Additional Services",
] as const;
