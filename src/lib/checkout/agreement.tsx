/* ── Agreement Checkout: signed agreement PDF (in-house, client-side) ──
 * The client's copy of what they signed: deal terms + their signature, name and
 * date. Same react-pdf approach as the invoice; lazy-import from the handler:
 *   const { downloadAgreementPdf } = await import("@/lib/checkout/agreement");
 *   await downloadAgreementPdf(checkout);
 * Needs checkout.signatureImage / signedName / signedAt to be set.
 */

import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { computeVat } from "./vat";
import { SELLER, PDF } from "./company";
import type { Checkout } from "./types";

const { ink, grey, faint, lime } = PDF;

const money = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n);

const fmtDate = (iso?: string) =>
  new Date(iso ?? new Date().toISOString()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontSize: 10, color: ink, fontFamily: "Helvetica", lineHeight: 1.5 },
  rule: { height: 3, width: 40, backgroundColor: lime, marginBottom: 20 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.5, marginBottom: 2 },
  meta: { color: grey, fontSize: 9, lineHeight: 1.4 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  section: { marginBottom: 20 },
  h: { fontSize: 7.5, letterSpacing: 0.6, color: grey, textTransform: "uppercase", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: faint },
  strong: { fontFamily: "Helvetica-Bold" },
  terms: { color: ink, fontSize: 9.5 },
  signBlock: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  sigBox: { borderBottomWidth: 1, borderBottomColor: ink, width: 220, paddingBottom: 4 },
  sigImg: { width: 200, height: 56, objectFit: "contain" },
  footer: { position: "absolute", bottom: 40, left: 56, right: 56, borderTopWidth: 1, borderTopColor: faint, paddingTop: 12, color: grey, fontSize: 8, lineHeight: 1.5 },
});

export function AgreementDocument({ c }: { c: Checkout }) {
  const vat = computeVat(c.amountGross, c.billingCountry);
  const ccy = c.currency;
  const per = c.engagementType === "retainer" ? " / month" : "";

  return (
    <Document title={`Agreement ${c.company || c.clientName}`} author={SELLER.name}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <View style={s.rule} />
            <Text style={s.brand}>{SELLER.name}</Text>
            {SELLER.addressLines.filter(Boolean).map((l, i) => (
              <Text key={i} style={s.meta}>{l}</Text>
            ))}
            <Text style={s.meta}>{SELLER.email}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Agreement</Text>
            <Text style={s.meta}>Signed {fmtDate(c.signedAt)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h}>Between</Text>
          <View style={s.row}>
            <Text>{SELLER.name}</Text>
            <Text style={{ color: grey }}>Provider</Text>
          </View>
          <View style={s.row}>
            <Text>
              {c.clientName}
              {c.company ? ` · ${c.company}` : ""}
            </Text>
            <Text style={{ color: grey }}>Client</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h}>Engagement</Text>
          <View style={s.row}>
            <Text style={{ color: grey }}>Type</Text>
            <Text>{c.engagementType === "retainer" ? "Retainer (monthly)" : "One-time project"}</Text>
          </View>
          <View style={s.row}>
            <Text style={{ color: grey }}>Fee</Text>
            <Text style={s.strong}>
              {money(c.amountGross, ccy)}
              {per}
            </Text>
          </View>
          {vat.status === "uk" ? (
            <View style={s.row}>
              <Text style={{ color: grey }}>Includes VAT (20%)</Text>
              <Text>{money(vat.vat, ccy)}</Text>
            </View>
          ) : null}
          {vat.status === "outside" ? (
            <View style={s.row}>
              <Text style={{ color: grey }}>VAT</Text>
              <Text>Outside of UK VAT</Text>
            </View>
          ) : null}
          {c.scope ? (
            <View style={s.row}>
              <Text style={{ color: grey }}>Scope</Text>
              <Text style={{ maxWidth: 340, textAlign: "right" }}>{c.scope}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.h}>Terms</Text>
          <Text style={s.terms}>
            90-day initial commitment, then rolling monthly. Prices are VAT inclusive.
            {c.termsNote ? ` ${c.termsNote}` : ""}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.h}>Signed by the client</Text>
          <View style={s.signBlock}>
            <View>
              {c.signatureImage ? <Image src={c.signatureImage} style={s.sigImg} /> : null}
              <View style={s.sigBox}>
                <Text style={s.strong}>{c.signedName || c.clientName}</Text>
              </View>
              <Text style={[s.meta, { marginTop: 4 }]}>Signature</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.strong}>{fmtDate(c.signedAt)}</Text>
              <Text style={s.meta}>Date · {c.billingCountry || "GB"}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{SELLER.name} · Agreement reference {c.id}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Build the signed agreement as a Blob (browser). */
export async function agreementBlob(c: Checkout): Promise<Blob> {
  return pdf(<AgreementDocument c={c} />).toBlob();
}

/** Generate + trigger a download of the signed agreement PDF (browser only). */
export async function downloadAgreementPdf(c: Checkout): Promise<void> {
  const blob = await agreementBlob(c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Agreement-${c.company || c.clientName}-${c.id}.pdf`.replace(/\s+/g, "-");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
