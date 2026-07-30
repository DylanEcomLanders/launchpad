/* ── Agreement Checkout: Services Agreement PDF (in-house, client-side) ──
 * The full legal agreement the client signs, generated per deal. Two variants:
 *   - retainer  -> Conversion Engine Entry Retainer (90-day minimum term)
 *   - project   -> Conversion Engine Project (fixed scope, one-off fee)
 * Mirrors the Keggy retainer agreement. Populated from the checkout record +
 * the new clientAddress / signatoryPosition fields. Lazy-imported from the
 * handler so react-pdf only loads in the browser on download.
 */

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { SELLER, AGENCY_SIGNATORY, PDF } from "./company";
import type { Checkout } from "./types";

const { ink, grey, faint, lime } = PDF;

const money = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

type Item = { n: string; text: string };
type Clause = { title: string; items: Item[] };

/* ── Variant-specific clauses 1-3 ── */
function servicesAndFees(c: Checkout): { subtitle: string; clauses: Clause[] } {
  if (c.engagementType === "retainer") {
    return {
      subtitle: "Conversion Engine Entry Retainer (90-Day Minimum Term)",
      clauses: [
        {
          title: "1. SERVICES",
          items: [
            { n: "1.1", text: "The Agency shall provide the Client with its Conversion Engine Entry retainer service (the “Services”), comprising in each calendar month of the Term: (a) two (2) page builds, designed and coded from scratch by the Agency; and (b) two (2) A/B tests, in each case inclusive of copywriting, design, Shopify development, implementation, quality assurance, testing and performance reporting." },
            { n: "1.2", text: "The scope, order and prioritisation of individual builds and tests shall be agreed between the parties in writing (including via WhatsApp or email) during the Term and may be adjusted by mutual agreement based on performance data." },
            { n: "1.3", text: "Any monthly build or test allowance not used in a given month shall roll forward to subsequent months within the Term but shall expire, without refund or credit, at the end of the Term." },
            { n: "1.4", text: "The Agency designs and builds all deliverables from scratch and shall not be required to develop or implement designs or mockups supplied by the Client or any third party." },
            { n: "1.5", text: "The Services are provided on a deliverables basis with reasonable skill and care; the Agency does not guarantee any particular commercial result or metric, and the absence of any particular result shall not constitute a breach of this Agreement nor entitle the Client to withhold Fees or terminate before the end of the Term." },
          ],
        },
        {
          title: "2. TERM AND MINIMUM COMMITMENT",
          items: [
            { n: "2.1", text: "This Agreement shall commence on the Effective Date and shall continue for a minimum period of ninety (90) days (the “Term”)." },
            { n: "2.2", text: "The Client acknowledges that the Term is a binding minimum commitment. Provided the Agency continues to perform the Services materially in accordance with clause 1, the Client may not terminate this Agreement before the end of the Term and shall remain liable for all Fees for the full Term." },
            { n: "2.3", text: "If the Client purports to terminate, suspends the engagement, or fails to cooperate such that the Agency is prevented from performing the Services before the end of the Term (other than by reason of the Agency's material breach), all unpaid Fees for the remainder of the Term shall become immediately due and payable as a debt." },
            { n: "2.4", text: "Either party may terminate this Agreement with immediate effect by written notice if the other party commits a material breach which is incapable of remedy, or which is capable of remedy but is not remedied within fourteen (14) days of written notice requiring it to do so, or if the other party becomes insolvent." },
          ],
        },
      ],
    };
  }
  // project
  return {
    subtitle: "Conversion Engine Project (Fixed Scope)",
    clauses: [
      {
        title: "1. SERVICES",
        items: [
          { n: "1.1", text: `The Agency shall provide the Client with the following project (the “Services”): ${c.scope || "the project as agreed between the parties in writing"}. The Services are designed and coded from scratch by the Agency and are inclusive of copywriting, design, Shopify development, implementation, quality assurance and testing.` },
          { n: "1.2", text: "The scope and prioritisation of the work shall be agreed between the parties in writing (including via WhatsApp or email) and may be adjusted by mutual agreement." },
          { n: "1.3", text: "The Agency designs and builds all deliverables from scratch and shall not be required to develop or implement designs or mockups supplied by the Client or any third party." },
          { n: "1.4", text: "The Services are provided on a deliverables basis with reasonable skill and care; the Agency does not guarantee any particular commercial result or metric, and the absence of any particular result shall not constitute a breach of this Agreement." },
        ],
      },
      {
        title: "2. TERM",
        items: [
          { n: "2.1", text: "This Agreement shall commence on the Effective Date and shall continue until the Services have been delivered and accepted by the Client, such acceptance not to be unreasonably withheld or delayed." },
          { n: "2.2", text: "The Fee is payable in full in advance. Once the Agency has commenced work, the engagement may not be cancelled for convenience and the Fee shall remain payable in full." },
          { n: "2.3", text: "Either party may terminate this Agreement with immediate effect by written notice if the other party commits a material breach which is incapable of remedy, or which is capable of remedy but is not remedied within fourteen (14) days of written notice requiring it to do so, or if the other party becomes insolvent." },
        ],
      },
    ],
  };
}

function feesClause(c: Checkout): Clause {
  if (c.engagementType === "retainer") {
    return {
      title: "3. FEES AND PAYMENT",
      items: [
        { n: "3.1", text: "The Client shall pay the fees set out in the table above (the “Fees”). Each monthly Fee is payable in advance and is due within seven (7) days of the date of the Agency's invoice for that month." },
        { n: "3.2", text: "The Fees are inclusive of VAT (if applicable). No further amount in respect of VAT shall be payable by the Client in addition to the Fees." },
        { n: "3.3", text: "If any sum is not paid when due, the Agency may charge interest and compensation in accordance with the Late Payment of Commercial Debts (Interest) Act 1998 and may suspend performance of the Services until payment is received. Any period of suspension shall not reduce the Client's liability for the Fees." },
        { n: "3.4", text: "The Fees are non-refundable except where required by law or in the event of termination for the Agency's material breach under clause 2.4." },
      ],
    };
  }
  return {
    title: "3. FEES AND PAYMENT",
    items: [
      { n: "3.1", text: "The Client shall pay the fee set out above (the “Fee”). The Fee is payable in full in advance and is due on or before the Effective Date." },
      { n: "3.2", text: "The Fee is inclusive of VAT (if applicable). No further amount in respect of VAT shall be payable by the Client in addition to the Fee." },
      { n: "3.3", text: "If any sum is not paid when due, the Agency may charge interest and compensation in accordance with the Late Payment of Commercial Debts (Interest) Act 1998 and may suspend performance until payment is received." },
      { n: "3.4", text: "The Fee is non-refundable except where required by law or in the event of termination for the Agency's material breach under clause 2.3." },
    ],
  };
}

/* ── Shared clauses 4-9 ── */
const SHARED: Clause[] = [
  {
    title: "4. CLIENT OBLIGATIONS",
    items: [
      { n: "4.1", text: "The Client shall promptly provide the Agency with all access, materials and cooperation reasonably required to perform the Services, including Shopify store access, brand assets, product information and imagery, analytics access, and timely feedback and approvals." },
      { n: "4.2", text: "Timeframes communicated by the Agency are estimates and are conditional on the Client complying with clause 4.1. Delays caused by the Client shall extend affected timeframes accordingly and shall not reduce the Fees." },
    ],
  },
  {
    title: "5. INTELLECTUAL PROPERTY",
    items: [
      { n: "5.1", text: "Upon receipt by the Agency of all Fees due for the relevant deliverable, all intellectual property rights in the completed deliverables created for the Client under this Agreement shall be assigned to, and belong exclusively to, the Client." },
      { n: "5.2", text: "The Agency retains all rights in its pre-existing materials, know-how, tools, processes and frameworks, and grants the Client a non-exclusive, perpetual licence to use the same solely as embedded in the deliverables." },
      { n: "5.3", text: "The Agency may, with the Client's prior written consent (not to be unreasonably withheld), reference the work and anonymised results in its portfolio and marketing." },
    ],
  },
  {
    title: "6. CONFIDENTIALITY",
    items: [
      { n: "6.1", text: "Each party shall keep confidential all non-public information disclosed by the other party in connection with this Agreement and shall use it only for the purposes of this Agreement. This clause shall survive termination for a period of two (2) years." },
    ],
  },
  {
    title: "7. LIMITATION OF LIABILITY",
    items: [
      { n: "7.1", text: "Neither party shall be liable for any loss of profit, loss of revenue, loss of business, loss of anticipated savings or any indirect or consequential loss." },
      { n: "7.2", text: "The Agency's total aggregate liability arising under or in connection with this Agreement shall not exceed the total Fees paid by the Client under this Agreement." },
    ],
  },
  {
    title: "8. GENERAL",
    items: [
      { n: "8.1", text: "Entire agreement. This Agreement constitutes the entire agreement between the parties in relation to its subject matter and supersedes all prior discussions and correspondence, including messages exchanged via WhatsApp." },
      { n: "8.2", text: "Variation. No variation of this Agreement shall be effective unless in writing and agreed by both parties (email being sufficient)." },
      { n: "8.3", text: "Assignment. Neither party may assign this Agreement without the other's prior written consent, not to be unreasonably withheld." },
      { n: "8.4", text: "Force majeure. Neither party shall be in breach of this Agreement for delay or failure caused by events beyond its reasonable control." },
      { n: "8.5", text: "Third parties. No person other than a party to this Agreement shall have any rights under the Contracts (Rights of Third Parties) Act 1999 to enforce any term of this Agreement." },
      { n: "8.6", text: "Notices. Formal notices under this Agreement shall be given in writing by email to the addresses set out below the signature blocks, and shall be deemed received on the next business day after sending." },
    ],
  },
  {
    title: "9. GOVERNING LAW AND JURISDICTION",
    items: [
      { n: "9.1", text: "This Agreement and any dispute or claim arising out of or in connection with it (including non-contractual disputes or claims) shall be governed by and construed in accordance with the law of England and Wales, and the parties irrevocably submit to the exclusive jurisdiction of the courts of England and Wales." },
    ],
  },
];

const s = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 60, paddingHorizontal: 56, fontSize: 9, color: ink, fontFamily: "Helvetica", lineHeight: 1.45 },
  rule: { height: 3, width: 36, backgroundColor: lime, marginBottom: 14 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textAlign: "center" },
  subtitle: { fontSize: 9.5, color: grey, textAlign: "center", marginTop: 3, marginBottom: 18 },
  intro: { marginBottom: 4 },
  party: { marginBottom: 3, paddingLeft: 14 },
  clause: { marginTop: 12 },
  clauseTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  itemRow: { flexDirection: "row", marginBottom: 3 },
  itemNum: { width: 26, fontFamily: "Helvetica-Bold" },
  itemText: { flex: 1, textAlign: "justify" },
  // fee table
  feeTable: { marginTop: 8, marginBottom: 4, borderTopWidth: 1, borderTopColor: ink },
  feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: faint },
  feeTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: ink },
  bold: { fontFamily: "Helvetica-Bold" },
  // signatures
  signWrap: { marginTop: 22, flexDirection: "row", gap: 28 },
  signCol: { flex: 1 },
  signLabel: { fontSize: 8, color: grey, marginBottom: 10 },
  sigImg: { width: 150, height: 44, objectFit: "contain", marginBottom: 2 },
  sigText: { fontSize: 13, fontFamily: "Helvetica-Oblique", marginBottom: 2 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: ink, height: 30, marginBottom: 4 },
  sigField: { fontSize: 8.5, marginBottom: 2 },
  footer: { position: "absolute", bottom: 34, left: 56, right: 56, borderTopWidth: 1, borderTopColor: faint, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", color: grey, fontSize: 7.5 },
});

function ItemList({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it) => (
        <View key={it.n} style={s.itemRow} wrap={false}>
          <Text style={s.itemNum}>{it.n}</Text>
          <Text style={s.itemText}>{it.text}</Text>
        </View>
      ))}
    </>
  );
}

function FeeTable({ c }: { c: Checkout }) {
  const ccy = c.currency;
  if (c.engagementType === "retainer") {
    const m = c.amountGross;
    return (
      <View style={s.feeTable}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={s.feeRow}>
            <Text>Month {n}</Text>
            <Text>{money(m, ccy)}</Text>
          </View>
        ))}
        <View style={s.feeTotal}>
          <Text style={s.bold}>Total for the Term</Text>
          <Text style={s.bold}>{money(m * 3, ccy)}</Text>
        </View>
        <Text style={{ marginTop: 4, color: grey, fontSize: 8 }}>Fees are inclusive of VAT, if applicable.</Text>
      </View>
    );
  }
  return (
    <View style={s.feeTable}>
      <View style={s.feeTotal}>
        <Text style={s.bold}>Project Fee</Text>
        <Text style={s.bold}>{money(c.amountGross, ccy)}</Text>
      </View>
      <Text style={{ marginTop: 4, color: grey, fontSize: 8 }}>Fee is inclusive of VAT, if applicable.</Text>
    </View>
  );
}

export function AgreementDocument({ c }: { c: Checkout }) {
  const { subtitle, clauses } = servicesAndFees(c);
  const fees = feesClause(c);
  const clientName = c.company || c.clientName;
  const effective = fmtDate(c.signedAt) || fmtDate(c.created_at);

  return (
    <Document title={`Services Agreement - ${clientName}`} author={SELLER.name}>
      <Page size="A4" style={s.page}>
        <View style={{ alignItems: "center" }}>
          <View style={s.rule} />
        </View>
        <Text style={s.title}>SERVICES AGREEMENT</Text>
        <Text style={s.subtitle}>{subtitle}</Text>

        <Text style={s.intro}>
          THIS AGREEMENT is made on the date of last signature below (the &ldquo;Effective Date&rdquo;).
        </Text>
        <Text style={[s.intro, s.bold]}>BETWEEN:</Text>
        <Text style={s.party}>
          (1) {SELLER.name}, a company incorporated in England and Wales (company no. {SELLER.companyNumber}) whose
          registered office is at {SELLER.registeredOffice} (the &ldquo;Agency&rdquo;); and
        </Text>
        <Text style={s.party}>
          (2) {clientName}, whose registered office is at {c.clientAddress || "[registered address]"} (the
          &ldquo;Client&rdquo;), acting through its authorised signatory {c.signedName || "[name]"}.
        </Text>
        <Text style={{ marginTop: 3 }}>each a &ldquo;party&rdquo; and together the &ldquo;parties&rdquo;.</Text>

        {/* Clauses 1-2 (variant) */}
        {clauses.map((cl) => (
          <View key={cl.title} style={s.clause}>
            <Text style={s.clauseTitle}>{cl.title}</Text>
            <ItemList items={cl.items} />
          </View>
        ))}

        {/* Clause 3: fees table + payment terms */}
        <View style={s.clause}>
          <Text style={s.clauseTitle}>{fees.title}</Text>
          <FeeTable c={c} />
          <ItemList items={fees.items} />
        </View>

        {/* Shared clauses 4-9 */}
        {SHARED.map((cl) => (
          <View key={cl.title} style={s.clause}>
            <Text style={s.clauseTitle}>{cl.title}</Text>
            <ItemList items={cl.items} />
          </View>
        ))}

        {/* Signatures */}
        <View style={{ marginTop: 18 }} wrap={false}>
          <Text style={s.bold}>SIGNED by the parties or their duly authorised representatives:</Text>
          <View style={s.signWrap}>
            <View style={s.signCol}>
              <Text style={s.signLabel}>For and on behalf of {SELLER.name}</Text>
              <Text style={s.sigText}>{AGENCY_SIGNATORY.signature}</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: ink, marginBottom: 4 }} />
              <Text style={s.sigField}>Name: {AGENCY_SIGNATORY.name}</Text>
              <Text style={s.sigField}>Position: {AGENCY_SIGNATORY.position}</Text>
              <Text style={s.sigField}>Date: {fmtDate(c.created_at)}</Text>
              <Text style={s.sigField}>Email for notices: {SELLER.email}</Text>
            </View>
            <View style={s.signCol}>
              <Text style={s.signLabel}>For and on behalf of {clientName}</Text>
              {c.signatureImage && c.signatureImage.startsWith("data:") ? (
                <Image src={c.signatureImage} style={s.sigImg} />
              ) : (
                <View style={s.sigLine} />
              )}
              <View style={{ borderBottomWidth: 1, borderBottomColor: ink, marginBottom: 4 }} />
              <Text style={s.sigField}>Name: {c.signedName || ""}</Text>
              <Text style={s.sigField}>Position: {c.signatoryPosition || ""}</Text>
              <Text style={s.sigField}>Date: {effective}</Text>
              <Text style={s.sigField}>Email for notices: {c.email}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{SELLER.name} - Services Agreement</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Build the signed agreement as a Blob (browser). */
export async function agreementBlob(c: Checkout): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  return pdf(<AgreementDocument c={c} />).toBlob();
}

/** Generate + trigger a download of the signed agreement PDF (browser only). */
export async function downloadAgreementPdf(c: Checkout): Promise<void> {
  const blob = await agreementBlob(c);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Agreement-${(c.company || c.clientName).replace(/\s+/g, "-")}-${c.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
