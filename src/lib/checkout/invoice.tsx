/* ── Agreement Checkout: invoice PDF (in-house, client-side) ──
 * Generates the downloadable invoice with @react-pdf/renderer. No external
 * service. Import this module lazily from the click handler so react-pdf is
 * only loaded in the browser when a client actually downloads:
 *   const { downloadInvoicePdf } = await import("@/lib/checkout/invoice");
 *   await downloadInvoicePdf(checkout);
 *
 * EDIT `SELLER` below with the real company details (address, company number,
 * and VAT number once registered). VAT number is pulled from lib/checkout/vat.
 */

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { computeVat, VAT_NUMBER } from "./vat";
import type { Checkout } from "./types";

// TODO(dylan): fill in the real registered details before sending live invoices.
const SELLER = {
  name: "Ecom Landers",
  addressLines: ["", ""], // e.g. ["1 Example Street, London", "EC1A 1BB, United Kingdom"]
  email: "hello@ecomlanders.com",
};

const money = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n);

const fmtDate = (iso?: string) =>
  new Date(iso ?? new Date().toISOString()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const ink = "#1a1b1e";
const grey = "#6b6b70";
const faint = "#e5e5e7";
const lime = "#CDF93A";

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 56, fontSize: 10, color: ink, fontFamily: "Helvetica" },
  rule: { height: 3, width: 40, backgroundColor: lime, marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.5, marginBottom: 2 },
  meta: { color: grey, fontSize: 9 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  cols: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  colLabel: { fontSize: 7.5, letterSpacing: 0.6, color: grey, textTransform: "uppercase", marginBottom: 4 },
  strong: { fontFamily: "Helvetica-Bold" },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: faint },
  lineHead: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: ink },
  totals: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: ink },
  footer: { position: "absolute", bottom: 40, left: 56, right: 56, borderTopWidth: 1, borderTopColor: faint, paddingTop: 12, color: grey, fontSize: 8, lineHeight: 1.5 },
});

export function InvoiceDocument({ c }: { c: Checkout }) {
  const vat = computeVat(c.amountGross, c.billingCountry);
  const ccy = c.currency;
  const billedTo = [c.company || c.clientName, c.company ? c.clientName : "", c.email].filter(Boolean);
  const desc =
    (c.engagementType === "retainer" ? "Retainer" : "Project") + (c.scope ? ` — ${c.scope}` : "");

  return (
    <Document title={`Invoice ${c.invoiceNumber ?? ""}`} author={SELLER.name}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <View style={s.rule} />
            <Text style={s.brand}>{SELLER.name}</Text>
            {SELLER.addressLines.filter(Boolean).map((l, i) => (
              <Text key={i} style={s.meta}>{l}</Text>
            ))}
            <Text style={s.meta}>{SELLER.email}</Text>
            {VAT_NUMBER ? <Text style={s.meta}>VAT no. {VAT_NUMBER}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Invoice</Text>
            <Text style={s.meta}>{c.invoiceNumber ?? "—"}</Text>
            <Text style={s.meta}>{fmtDate(c.paidAt)}</Text>
          </View>
        </View>

        <View style={s.cols}>
          <View style={{ maxWidth: 240 }}>
            <Text style={s.colLabel}>Billed to</Text>
            {billedTo.map((l, i) => (
              <Text key={i} style={i === 0 ? s.strong : undefined}>{l}</Text>
            ))}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.colLabel}>Status</Text>
            <Text style={s.strong}>Paid</Text>
            {c.paidAt ? <Text style={s.meta}>{fmtDate(c.paidAt)}</Text> : null}
          </View>
        </View>

        <View style={s.lineHead}>
          <Text style={[s.colLabel, { marginBottom: 0 }]}>Description</Text>
          <Text style={[s.colLabel, { marginBottom: 0 }]}>Amount</Text>
        </View>
        <View style={s.line}>
          <Text style={{ maxWidth: 380 }}>
            {desc}
            {c.engagementType === "retainer" ? "  (monthly)" : ""}
          </Text>
          <Text>{money(vat.status === "uk" ? vat.net : c.amountGross, ccy)}</Text>
        </View>

        <View style={s.totals}>
          {vat.status === "uk" ? (
            <>
              <View style={s.totalRow}>
                <Text style={{ color: grey }}>Subtotal</Text>
                <Text>{money(vat.net, ccy)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={{ color: grey }}>VAT (20%)</Text>
                <Text>{money(vat.vat, ccy)}</Text>
              </View>
            </>
          ) : null}
          <View style={s.grand}>
            <Text style={s.strong}>Total {c.engagementType === "retainer" ? "/ month" : ""}</Text>
            <Text style={s.strong}>{money(c.amountGross, ccy)}</Text>
          </View>
          {vat.status === "outside" ? (
            <Text style={[s.meta, { marginTop: 6 }]}>Outside of UK VAT.</Text>
          ) : null}
          {vat.status === "none" ? (
            <Text style={[s.meta, { marginTop: 6 }]}>Price is VAT inclusive.</Text>
          ) : null}
        </View>

        <View style={s.footer} fixed>
          <Text>{SELLER.name} · Payment received {fmtDate(c.paidAt)} · Ref {c.whopPaymentId ?? c.id}</Text>
          <Text>Thank you for your business.</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Build the invoice as a Blob (browser). */
export async function invoiceBlob(c: Checkout): Promise<Blob> {
  return pdf(<InvoiceDocument c={c} />).toBlob();
}

/** Generate + trigger a download of the invoice PDF (browser only). */
export async function downloadInvoicePdf(c: Checkout): Promise<void> {
  const blob = await invoiceBlob(c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${c.invoiceNumber ?? c.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
