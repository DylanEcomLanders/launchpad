"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PdfLogo, formatDate } from "@/lib/pdf-shared";
import { fmtMoney } from "@/lib/finance/data";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import type { InvoiceIssued, CompanyProfile } from "@/lib/finance/types";

/* ── Visual language ─────────────────────────────────────────────────
 * Modern + restrained. Smaller type, tighter spacing, lighter weights.
 * Reference points: Stripe / Linear / Notion invoices.
 *
 * Type scale (pt):
 *   14    invoice number / total due (hero values, semibold)
 *   10    party name (semibold)
 *    9    body text, addresses, line items
 *    8    metadata values
 *    6.5  uppercase labels with letter spacing
 *
 * Colour palette:
 *   #111  near-black for primary text
 *   #555  mid grey for secondary text
 *   #999  light grey for labels / footer
 *   #EAEAEA  hairline borders
 *   no fills, no rounded boxes
 * ─────────────────────────────────────────────────────────────────── */

const ink = "#111111";
const mid = "#555555";
const muted = "#999999";
const hairline = "#EAEAEA";

const s = StyleSheet.create({
  page: {
    fontFamily: "PlusJakartaSans",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 56,
    paddingTop: 52,
    paddingBottom: 60,
    color: ink,
  },

  /* ── Hero ── */
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  heroRight: {
    alignItems: "flex-end",
  },
  heroLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  heroNumber: {
    fontSize: 14,
    fontWeight: 600,
    color: ink,
    letterSpacing: -0.2,
  },

  /* ── Meta strip (issued/due/terms) ── */
  metaStrip: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: hairline,
    borderBottomWidth: 0.5,
    borderBottomColor: hairline,
    paddingVertical: 12,
    marginBottom: 28,
  },
  metaCell: {
    flex: 1,
    paddingRight: 12,
  },
  metaLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 500,
    color: ink,
  },

  /* ── Addresses (From / Bill To) ── */
  partyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  partyCol: {
    width: "48%",
  },
  partyLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 600,
    color: ink,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 9,
    fontWeight: 400,
    color: mid,
    lineHeight: 1.5,
  },
  partyMeta: {
    fontSize: 8,
    fontWeight: 400,
    color: muted,
    marginTop: 6,
    lineHeight: 1.55,
  },

  /* ── Line items ── */
  itemsHeader: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: ink,
  },
  itemsHeaderText: {
    fontSize: 6.5,
    fontWeight: 600,
    color: ink,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: hairline,
  },
  colDesc: { flex: 1, paddingRight: 12 },
  colQty: { width: 36, textAlign: "center" },
  colPrice: { width: 72, textAlign: "right" },
  colAmount: { width: 84, textAlign: "right" },
  itemText: {
    fontSize: 9,
    fontWeight: 500,
    color: ink,
  },
  itemMuted: {
    fontSize: 9,
    fontWeight: 400,
    color: mid,
  },

  /* ── Totals ── */
  totalsWrap: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsPanel: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    fontWeight: 400,
    color: mid,
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: 500,
    color: ink,
  },
  totalDivider: {
    borderTopWidth: 0.5,
    borderTopColor: ink,
    marginTop: 6,
    paddingTop: 8,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: ink,
  },
  totalFinalValue: {
    fontSize: 14,
    fontWeight: 600,
    color: ink,
    letterSpacing: -0.2,
  },

  /* ── VAT note ── */
  vatNote: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: hairline,
    fontSize: 8,
    color: muted,
    lineHeight: 1.55,
  },

  /* ── Payment + notes ── */
  paymentSection: {
    marginTop: 36,
    paddingTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: hairline,
  },
  paymentLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentField: {
    width: "50%",
    marginBottom: 8,
  },
  paymentFieldLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: muted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  paymentFieldValue: {
    fontSize: 9,
    fontWeight: 500,
    color: ink,
  },
  notesText: {
    fontSize: 8.5,
    fontWeight: 400,
    color: mid,
    marginTop: 6,
    lineHeight: 1.55,
  },

  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: hairline,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLeft: {
    fontSize: 7,
    color: muted,
  },
  footerRight: {
    fontSize: 7,
    color: muted,
    textAlign: "right",
  },
});

interface Props {
  invoice: InvoiceIssued;
  profile: CompanyProfile;
}

export function FinanceInvoicePdf({ invoice, profile }: Props) {
  const breakdown = calculateVatBreakdown(
    invoice.items,
    invoice.vat_treatment,
    invoice.vat_amount_override,
  );

  const method = invoice.payment_method ?? "online";
  const hasBankDetails =
    !!invoice.bank_name ||
    !!invoice.account_name ||
    !!invoice.sort_code ||
    !!invoice.account_number;
  const showOnline = method === "online";
  const showBank = method === "bank_transfer" && hasBankDetails;
  const hasPaymentSection = showOnline || showBank;

  const paymentFields: Array<{ label: string; value: string }> = [];
  if (invoice.bank_name) paymentFields.push({ label: "Bank", value: invoice.bank_name });
  if (invoice.account_name)
    paymentFields.push({ label: "Account name", value: invoice.account_name });
  if (invoice.sort_code) paymentFields.push({ label: "Sort code", value: invoice.sort_code });
  if (invoice.account_number)
    paymentFields.push({ label: "Account number", value: invoice.account_number });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Hero ── */}
        <View style={s.hero}>
          <PdfLogo height={14} />
          <View style={s.heroRight}>
            <Text style={s.heroLabel}>Invoice</Text>
            <Text style={s.heroNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* ── Meta strip ── */}
        <View style={s.metaStrip}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Issued</Text>
            <Text style={s.metaValue}>{formatDate(invoice.invoice_date)}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Due</Text>
            <Text style={s.metaValue}>{formatDate(invoice.due_date)}</Text>
          </View>
          {invoice.payment_term ? (
            <View style={[s.metaCell, { flex: 1.6 }]}>
              <Text style={s.metaLabel}>Payment terms</Text>
              <Text style={s.metaValue}>{invoice.payment_term}</Text>
            </View>
          ) : null}
        </View>

        {/* ── From / Bill To ── */}
        <View style={s.partyRow}>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>From</Text>
            <Text style={s.partyName}>{profile.legal_name}</Text>
            {profile.address_lines.map((line, i) => (
              <Text key={i} style={s.partyLine}>
                {line}
              </Text>
            ))}
            <Text style={s.partyMeta}>
              Company No. {profile.company_number}
              {profile.vat_number ? `\nVAT ${profile.vat_number}` : ""}
              {profile.email ? `\n${profile.email}` : ""}
            </Text>
          </View>

          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Bill to</Text>
            <Text style={s.partyName}>{invoice.client_name}</Text>
            {invoice.contact_name ? (
              <Text style={s.partyLine}>{invoice.contact_name}</Text>
            ) : null}
            {invoice.client_address ? (
              <Text style={s.partyLine}>{invoice.client_address}</Text>
            ) : null}
            {invoice.client_email ? (
              <Text style={s.partyMeta}>{invoice.client_email}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Line items ── */}
        <View>
          <View style={s.itemsHeader}>
            <Text style={[s.itemsHeaderText, s.colDesc]}>Description</Text>
            <Text style={[s.itemsHeaderText, s.colQty]}>Qty</Text>
            <Text style={[s.itemsHeaderText, s.colPrice]}>Unit price</Text>
            <Text style={[s.itemsHeaderText, s.colAmount]}>Amount</Text>
          </View>

          {invoice.items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={[s.itemText, s.colDesc]}>{item.name}</Text>
              <Text style={[s.itemMuted, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.itemMuted, s.colPrice]}>{fmtMoney(item.unitPrice, invoice.currency)}</Text>
              <Text style={[s.itemText, s.colAmount]}>
                {fmtMoney(item.quantity * item.unitPrice, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalsPanel}>
            {invoice.vat_treatment === "inclusive_20" ? (
              // Inclusive: line items are at gross. Show Subtotal as
              // gross with a muted "of which VAT" line below so the
              // customer sees the breakdown without the math looking
              // broken. Total = Subtotal in this mode.
              <>
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>Subtotal (incl. VAT)</Text>
                  <Text style={s.totalsValue}>{fmtMoney(breakdown.total, invoice.currency)}</Text>
                </View>
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>
                    of which VAT ({Math.round(breakdown.vatRate * 100)}%)
                  </Text>
                  <Text style={s.totalsValue}>{fmtMoney(breakdown.vatAmount, invoice.currency)}</Text>
                </View>
                <View style={[s.totalsRow, s.totalDivider]}>
                  <Text style={s.totalFinalLabel}>Total due</Text>
                  <Text style={s.totalFinalValue}>{fmtMoney(breakdown.total, invoice.currency)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>Subtotal</Text>
                  <Text style={s.totalsValue}>{fmtMoney(breakdown.subtotal, invoice.currency)}</Text>
                </View>
                {breakdown.vatAmount > 0 && (
                  <View style={s.totalsRow}>
                    <Text style={s.totalsLabel}>
                      VAT ({Math.round(breakdown.vatRate * 100)}%)
                    </Text>
                    <Text style={s.totalsValue}>{fmtMoney(breakdown.vatAmount, invoice.currency)}</Text>
                  </View>
                )}
                <View style={[s.totalsRow, s.totalDivider]}>
                  <Text style={s.totalFinalLabel}>Total due</Text>
                  <Text style={s.totalFinalValue}>{fmtMoney(breakdown.total, invoice.currency)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {breakdown.noteForInvoice && (
          <View style={s.vatNote}>
            <Text>{breakdown.noteForInvoice}</Text>
          </View>
        )}

        {/* ── Payment + notes ── */}
        {(hasPaymentSection || invoice.notes) && (
          <View style={s.paymentSection}>
            {showOnline && (
              <View>
                <Text style={s.paymentLabel}>Payment</Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: ink,
                    lineHeight: 1.55,
                  }}
                >
                  This invoice is payable via Whop. You&rsquo;ll receive a separate Whop invoice with the secure payment link.
                </Text>
              </View>
            )}
            {showBank && (
              <View>
                <Text style={s.paymentLabel}>Pay by bank transfer</Text>
                <View style={s.paymentGrid}>
                  {paymentFields.map((f) => (
                    <View key={f.label} style={s.paymentField}>
                      <Text style={s.paymentFieldLabel}>{f.label}</Text>
                      <Text style={s.paymentFieldValue}>{f.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {invoice.notes ? (
              <Text style={s.notesText}>{invoice.notes}</Text>
            ) : null}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            {profile.legal_name}
            {profile.website ? ` · ${profile.website}` : ""}
          </Text>
          <Text style={s.footerRight}>
            Company No. {profile.company_number}
            {profile.vat_number ? ` · VAT ${profile.vat_number}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
