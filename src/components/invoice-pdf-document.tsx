"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PdfLogo, formatDate, shared as s } from "@/lib/pdf-shared";
import { formatGBP } from "@/lib/formatters";
import type { InvoiceData } from "@/app/(dashboard)/tools/invoice-generator/page";

const inv = StyleSheet.create({
  page: {
    fontFamily: "PlusJakartaSans",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 48,
    paddingTop: 48,
    paddingBottom: 80,
  },
  /* Header row: logo left, INVOICE right */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0A0A0A",
    letterSpacing: -0.5,
  },
  /* Meta section: invoice details + client details side by side */
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  metaCol: {
    maxWidth: "48%",
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 400,
    color: "#0A0A0A",
    marginBottom: 10,
    lineHeight: 1.5,
  },
  metaValueBold: {
    fontSize: 10,
    fontWeight: 600,
    color: "#0A0A0A",
    marginBottom: 10,
    lineHeight: 1.5,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  /* Table */
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
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
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
  tdText: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "#0A0A0A",
  },
  tdMuted: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "#6B6B6B",
  },
  /* Totals */
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    paddingVertical: 5,
  },
  totalsLabel: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "#6B6B6B",
    flex: 1,
  },
  totalsValue: {
    fontSize: 9.5,
    fontWeight: 500,
    color: "#0A0A0A",
    width: 90,
    textAlign: "right",
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 220,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0A0A0A",
    marginTop: 4,
  },
  totalsFinalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
    flex: 1,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
    width: 90,
    textAlign: "right",
  },
  /* Payment box */
  paymentBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6B6B6B",
    width: 100,
  },
  paymentValue: {
    fontSize: 9,
    fontWeight: 400,
    color: "#0A0A0A",
  },
  notesText: {
    fontSize: 9,
    fontWeight: 400,
    color: "#6B6B6B",
    marginTop: 8,
    lineHeight: 1.5,
  },
  /* Footer */
  footer: {
    position: "absolute",
    bottom: 36,
    left: 48,
    right: 48,
  },
  footerText: {
    fontSize: 8,
    color: "#AAAAAA",
    textAlign: "center",
  },
});

export function InvoicePdfDocument({ data }: { data: InvoiceData }) {
  const subtotal = data.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
  const vat = data.includeVat ? subtotal * 0.2 : 0;
  const total = subtotal + vat;

  const hasPaymentDetails =
    data.bankName || data.accountName || data.sortCode || data.accountNumber;

  return (
    <Document>
      <Page size="A4" style={inv.page}>
        {/* Header */}
        <View style={inv.header}>
          <PdfLogo height={13} />
          <Text style={inv.invoiceTitle}>INVOICE</Text>
        </View>

        {/* Meta: Invoice details + Client */}
        <View style={inv.metaRow}>
          {/* Left column — invoice info */}
          <View style={inv.metaCol}>
            <Text style={inv.metaLabel}>Invoice Number</Text>
            <Text style={inv.metaValueBold}>{data.invoiceNumber}</Text>

            <Text style={inv.metaLabel}>Invoice Date</Text>
            <Text style={inv.metaValue}>{formatDate(data.invoiceDate)}</Text>

            <Text style={inv.metaLabel}>Due Date</Text>
            <Text style={inv.metaValue}>{formatDate(data.dueDate)}</Text>

            {data.paymentTerm ? (
              <>
                <Text style={inv.metaLabel}>Payment Terms</Text>
                <Text style={inv.metaValue}>{data.paymentTerm}</Text>
              </>
            ) : null}
          </View>

          {/* Right column — client info */}
          <View style={inv.metaCol}>
            <Text style={inv.metaLabel}>Bill To</Text>
            <Text style={inv.metaValueBold}>{data.clientName}</Text>
            {data.contactName ? (
              <Text style={inv.metaValue}>{data.contactName}</Text>
            ) : null}
            {data.clientEmail ? (
              <Text style={inv.metaValue}>{data.clientEmail}</Text>
            ) : null}
            {data.clientAddress ? (
              <Text style={inv.metaValue}>{data.clientAddress}</Text>
            ) : null}
          </View>
        </View>

        {/* Line items table */}
        <View>
          {/* Table header */}
          <View style={inv.tableHeader}>
            <Text style={[inv.thText, inv.colDesc]}>Description</Text>
            <Text style={[inv.thText, inv.colQty]}>Qty</Text>
            <Text style={[inv.thText, inv.colPrice]}>Price</Text>
            <Text style={[inv.thText, inv.colAmount]}>Amount</Text>
          </View>

          {/* Table rows */}
          {data.items.map((item, idx) => (
            <View
              key={item.id}
              style={[inv.tableRow, idx % 2 === 1 ? inv.tableRowAlt : {}]}
            >
              <Text style={[inv.tdText, inv.colDesc]}>{item.name}</Text>
              <Text style={[inv.tdMuted, inv.colQty]}>{item.quantity}</Text>
              <Text style={[inv.tdMuted, inv.colPrice]}>
                {formatGBP(item.unitPrice)}
              </Text>
              <Text style={[inv.tdText, inv.colAmount]}>
                {formatGBP(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={inv.totalsSection}>
          <View style={inv.totalsRow}>
            <Text style={inv.totalsLabel}>Subtotal</Text>
            <Text style={inv.totalsValue}>{formatGBP(subtotal)}</Text>
          </View>
          {data.includeVat && (
            <View style={inv.totalsRow}>
              <Text style={inv.totalsLabel}>VAT (20%)</Text>
              <Text style={inv.totalsValue}>{formatGBP(vat)}</Text>
            </View>
          )}
          <View style={inv.totalsFinalRow}>
            <Text style={inv.totalsFinalLabel}>Total</Text>
            <Text style={inv.totalsFinalValue}>{formatGBP(total)}</Text>
          </View>
        </View>

        {/* Payment details */}
        {hasPaymentDetails && (
          <View style={inv.paymentBox}>
            <Text style={[inv.sectionLabel, { marginBottom: 10 }]}>
              Payment Details
            </Text>
            {data.bankName ? (
              <View style={inv.paymentRow}>
                <Text style={inv.paymentLabel}>Bank</Text>
                <Text style={inv.paymentValue}>{data.bankName}</Text>
              </View>
            ) : null}
            {data.accountName ? (
              <View style={inv.paymentRow}>
                <Text style={inv.paymentLabel}>Account Name</Text>
                <Text style={inv.paymentValue}>{data.accountName}</Text>
              </View>
            ) : null}
            {data.sortCode ? (
              <View style={inv.paymentRow}>
                <Text style={inv.paymentLabel}>Sort Code</Text>
                <Text style={inv.paymentValue}>{data.sortCode}</Text>
              </View>
            ) : null}
            {data.accountNumber ? (
              <View style={inv.paymentRow}>
                <Text style={inv.paymentLabel}>Account Number</Text>
                <Text style={inv.paymentValue}>{data.accountNumber}</Text>
              </View>
            ) : null}
            {data.notes ? (
              <Text style={inv.notesText}>{data.notes}</Text>
            ) : null}
          </View>
        )}

        {/* Notes (if no payment details but notes exist) */}
        {!hasPaymentDetails && data.notes ? (
          <View style={{ marginTop: 32 }}>
            <Text style={inv.sectionLabel}>Notes</Text>
            <Text style={inv.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={inv.footer} fixed>
          <Text style={inv.footerText}>Ecomlanders Ltd</Text>
        </View>
      </Page>
    </Document>
  );
}
