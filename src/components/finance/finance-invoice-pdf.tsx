"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PdfLogo, formatDate } from "@/lib/pdf-shared";
import { fmtMoney } from "@/lib/finance/data";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import type { InvoiceIssued, CompanyProfile } from "@/lib/finance/types";

const s = StyleSheet.create({
  page: {
    fontFamily: "PlusJakartaSans",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 48,
    paddingTop: 48,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  title: { fontSize: 24, fontWeight: 800, color: "#0A0A0A", letterSpacing: -0.5 },
  infoStrip: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAFA",
    borderRadius: 4,
    marginBottom: 24,
  },
  infoCell: { flex: 1, paddingHorizontal: 4 },
  infoLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoValue: { fontSize: 10, fontWeight: 600, color: "#0A0A0A" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  metaCol: { maxWidth: "48%" },
  metaLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValueBold: {
    fontSize: 10,
    fontWeight: 600,
    color: "#0A0A0A",
    marginBottom: 10,
    lineHeight: 1.5,
  },
  addressLine: {
    fontSize: 10,
    fontWeight: 400,
    color: "#0A0A0A",
    lineHeight: 1.45,
  },
  metaTinyMuted: { fontSize: 8.5, fontWeight: 400, color: "#6B6B6B", marginTop: 6 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  tableRowAlt: { backgroundColor: "#FAFAFA" },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "center" },
  colPrice: { width: 80, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  thText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tdText: { fontSize: 9.5, fontWeight: 400, color: "#0A0A0A" },
  tdMuted: { fontSize: 9.5, fontWeight: 400, color: "#6B6B6B" },
  totalsSection: { marginTop: 16, alignItems: "flex-end" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 240,
    paddingVertical: 5,
  },
  totalsLabel: { fontSize: 9.5, fontWeight: 400, color: "#6B6B6B", flex: 1 },
  totalsValue: { fontSize: 9.5, fontWeight: 500, color: "#0A0A0A", width: 100, textAlign: "right" },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 240,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0A0A0A",
    marginTop: 4,
  },
  totalsFinalLabel: { fontSize: 11, fontWeight: 700, color: "#0A0A0A", flex: 1 },
  totalsFinalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
    width: 100,
    textAlign: "right",
  },
  vatNote: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FAFAFA",
    borderLeftWidth: 2,
    borderLeftColor: "#0A0A0A",
    fontSize: 8.5,
    color: "#0A0A0A",
    lineHeight: 1.5,
  },
  paymentBox: { marginTop: 32, padding: 16, backgroundColor: "#F5F5F5", borderRadius: 4 },
  paymentRow: { flexDirection: "row", marginBottom: 4 },
  paymentLabel: { fontSize: 9, fontWeight: 600, color: "#6B6B6B", width: 100 },
  paymentValue: { fontSize: 9, fontWeight: 400, color: "#0A0A0A" },
  notesText: { fontSize: 9, fontWeight: 400, color: "#6B6B6B", marginTop: 8, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 36, left: 48, right: 48 },
  footerText: { fontSize: 8, color: "#AAAAAA", textAlign: "center" },
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

  const hasPaymentDetails =
    invoice.bank_name ||
    invoice.account_name ||
    invoice.sort_code ||
    invoice.account_number;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <PdfLogo height={13} />
          <Text style={s.title}>INVOICE</Text>
        </View>

        <View style={s.infoStrip}>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Invoice Number</Text>
            <Text style={s.infoValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Issued</Text>
            <Text style={s.infoValue}>{formatDate(invoice.invoice_date)}</Text>
          </View>
          <View style={s.infoCell}>
            <Text style={s.infoLabel}>Due</Text>
            <Text style={s.infoValue}>{formatDate(invoice.due_date)}</Text>
          </View>
          {invoice.payment_term ? (
            <View style={[s.infoCell, { flex: 1.6 }]}>
              <Text style={s.infoLabel}>Payment Terms</Text>
              <Text style={s.infoValue}>{invoice.payment_term}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.metaValueBold}>{profile.legal_name}</Text>
            {profile.address_lines.map((line, i) => (
              <Text key={i} style={s.addressLine}>
                {line}
              </Text>
            ))}
            <Text style={s.metaTinyMuted}>
              Company No. {profile.company_number}
              {profile.vat_number ? ` · VAT ${profile.vat_number}` : ""}
            </Text>
            {profile.email ? <Text style={s.addressLine}>{profile.email}</Text> : null}
          </View>

          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Bill To</Text>
            <Text style={s.metaValueBold}>{invoice.client_name}</Text>
            {invoice.contact_name ? (
              <Text style={s.addressLine}>{invoice.contact_name}</Text>
            ) : null}
            {invoice.client_email ? (
              <Text style={s.addressLine}>{invoice.client_email}</Text>
            ) : null}
            {invoice.client_address ? (
              <Text style={s.addressLine}>{invoice.client_address}</Text>
            ) : null}
          </View>
        </View>

        <View>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colDesc]}>Description</Text>
            <Text style={[s.thText, s.colQty]}>Qty</Text>
            <Text style={[s.thText, s.colPrice]}>Price</Text>
            <Text style={[s.thText, s.colAmount]}>Amount</Text>
          </View>

          {invoice.items.map((item, idx) => (
            <View
              key={item.id}
              style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tdText, s.colDesc]}>{item.name}</Text>
              <Text style={[s.tdMuted, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.tdMuted, s.colPrice]}>{fmtMoney(item.unitPrice)}</Text>
              <Text style={[s.tdText, s.colAmount]}>
                {fmtMoney(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.totalsSection}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{fmtMoney(breakdown.subtotal)}</Text>
          </View>
          {breakdown.vatAmount > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>
                VAT ({Math.round(breakdown.vatRate * 100)}%)
              </Text>
              <Text style={s.totalsValue}>{fmtMoney(breakdown.vatAmount)}</Text>
            </View>
          )}
          <View style={s.totalsFinalRow}>
            <Text style={s.totalsFinalLabel}>Total</Text>
            <Text style={s.totalsFinalValue}>{fmtMoney(breakdown.total)}</Text>
          </View>
        </View>

        {breakdown.noteForInvoice && (
          <View style={s.vatNote}>
            <Text>{breakdown.noteForInvoice}</Text>
          </View>
        )}

        {hasPaymentDetails && (
          <View style={s.paymentBox}>
            <Text style={[s.sectionLabel, { marginBottom: 10 }]}>Payment Details</Text>
            {invoice.bank_name ? (
              <View style={s.paymentRow}>
                <Text style={s.paymentLabel}>Bank</Text>
                <Text style={s.paymentValue}>{invoice.bank_name}</Text>
              </View>
            ) : null}
            {invoice.account_name ? (
              <View style={s.paymentRow}>
                <Text style={s.paymentLabel}>Account Name</Text>
                <Text style={s.paymentValue}>{invoice.account_name}</Text>
              </View>
            ) : null}
            {invoice.sort_code ? (
              <View style={s.paymentRow}>
                <Text style={s.paymentLabel}>Sort Code</Text>
                <Text style={s.paymentValue}>{invoice.sort_code}</Text>
              </View>
            ) : null}
            {invoice.account_number ? (
              <View style={s.paymentRow}>
                <Text style={s.paymentLabel}>Account Number</Text>
                <Text style={s.paymentValue}>{invoice.account_number}</Text>
              </View>
            ) : null}
            {invoice.notes ? <Text style={s.notesText}>{invoice.notes}</Text> : null}
          </View>
        )}

        {!hasPaymentDetails && invoice.notes ? (
          <View style={{ marginTop: 32 }}>
            <Text style={s.sectionLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {profile.legal_name} · {profile.address_lines.join(", ")} · Company No.{" "}
            {profile.company_number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
