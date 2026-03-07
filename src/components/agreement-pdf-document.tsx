"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { GeneratorFormData } from "@/lib/config";
import { PdfLogo, formatDate, shared as s } from "@/lib/pdf-shared";
import {
  ecomlanders,
  backgroundClauses,
  considerationText,
  standardTerms,
} from "@/lib/agreement-terms";

const a = StyleSheet.create({
  /* Parties */
  partiesRow: {
    flexDirection: "row",
    gap: 40,
    marginBottom: 24,
  },
  partyBlock: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#AAAAAA",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "#3A3A3A",
    lineHeight: 1.7,
  },

  /* Background clauses */
  backgroundLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0A0A0A",
    marginRight: 6,
  },
  backgroundRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 4,
  },
  backgroundText: {
    fontSize: 9,
    fontWeight: 400,
    color: "#3A3A3A",
    lineHeight: 1.7,
    flex: 1,
  },
  considerationText: {
    fontSize: 9,
    fontWeight: 400,
    color: "#3A3A3A",
    lineHeight: 1.7,
    marginTop: 12,
    marginBottom: 8,
  },
  considerationBold: {
    fontWeight: 700,
  },

  /* Commercial terms */
  termRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  termLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6B6B6B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  termValue: {
    fontSize: 10,
    fontWeight: 500,
    color: "#0A0A0A",
  },
  termRowHighlight: {
    backgroundColor: "#F5F5F5",
  },

  /* Milestone table */
  milestoneColDesc: {
    flex: 1,
  },
  milestoneColAmount: {
    width: 120,
    textAlign: "right",
  },

  /* Standard terms (legal text) */
  legalHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0A0A0A",
    marginTop: 16,
    marginBottom: 6,
  },
  legalBody: {
    fontSize: 9,
    fontWeight: 400,
    color: "#3A3A3A",
    lineHeight: 1.7,
    marginBottom: 8,
  },

  /* Deliverable bullet list (services) */
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 12,
  },
  bulletDot: {
    fontSize: 9,
    color: "#6B6B6B",
    marginRight: 8,
    width: 8,
  },
  bulletText: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "#3A3A3A",
    lineHeight: 1.7,
    flex: 1,
  },

  /* Signature blocks */
  sigRow: {
    flexDirection: "row",
    gap: 40,
    marginTop: 48,
  },
  sigBlock: {
    flex: 1,
  },
  sigImage: {
    height: 50,
    width: 180,
    objectFit: "contain",
    marginBottom: 8,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#0A0A0A",
    marginBottom: 8,
    height: 50,
  },
  sigLabel: {
    fontSize: 8,
    fontWeight: 500,
    color: "#6B6B6B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  sigFieldLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    marginBottom: 4,
    height: 20,
  },
  sigFieldLabel: {
    fontSize: 7.5,
    fontWeight: 500,
    color: "#AAAAAA",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sigFieldValue: {
    fontSize: 10,
    fontWeight: 500,
    color: "#0A0A0A",
    marginBottom: 4,
    height: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    paddingBottom: 2,
  },

  /* Sub-heading for sections */
  subHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A",
    letterSpacing: -0.3,
    marginBottom: 12,
    marginTop: 24,
  },

  /* Separator */
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    marginVertical: 24,
  },
});

function ContentHeader({
  clientName,
  fixed: isFixed,
}: {
  clientName: string;
  fixed?: boolean;
}) {
  return (
    <View style={s.pageHeader} fixed={isFixed}>
      <PdfLogo height={8} color="#AAAAAA" />
      <Text style={s.pageHeaderClient}>{clientName}</Text>
    </View>
  );
}

function PageFooter({ fixed: isFixed }: { fixed?: boolean } = {}) {
  return (
    <View style={s.footer} fixed={isFixed}>
      <Text style={s.footerText}>
        Confidential — for internal and client use only
      </Text>
    </View>
  );
}

export function AgreementPdfDocument({ data }: { data: GeneratorFormData }) {
  const ag = data.agreement;
  const validDeliverables = data.deliverables.filter(
    (d) => d.description.trim()
  );
  const today = formatDate(new Date().toISOString().split("T")[0]);
  const year = new Date().getFullYear().toString();

  return (
    <Document>
      {/* ──────── Page 1: Cover ──────── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.decoBlock1} />
        <View style={s.decoBlock2} />
        <View style={s.decoBlock3} />
        <View style={s.decoBlock4} />

        <PdfLogo height={14} />

        <View style={s.coverBody}>
          <Text style={s.coverTitle}>
            {ecomlanders.legalName} × {data.clientName}
          </Text>
          <Text style={s.coverSubtitle}>General Service Agreement</Text>
        </View>

        <View style={s.coverFooter}>
          <View style={s.coverRule} />
          <View style={s.coverFooterRow}>
            <View style={s.coverFooterLeft}>
              <Text style={s.coverYear}>{year}</Text>
              <Text style={s.coverArrow}>→</Text>
            </View>
            <Text style={s.coverFooterRight}>Service Agreement</Text>
          </View>
        </View>
      </Page>

      {/* ──────── Page 2: Parties, Background & Services ──────── */}
      <Page size="A4" style={s.contentPage}>
        <ContentHeader clientName={data.clientName} />

        <Text style={s.sectionHeading}>Parties</Text>

        <View style={a.partiesRow}>
          <View style={a.partyBlock}>
            <Text style={a.partyLabel}>Client</Text>
            <Text style={a.partyName}>{ag.clientLegalName}</Text>
            <Text style={a.partyDetail}>{ag.clientAddress}</Text>
            <Text style={a.partyDetail}>{ag.clientContactName}</Text>
            <Text style={a.partyDetail}>{ag.clientContactEmail}</Text>
          </View>
          <View style={a.partyBlock}>
            <Text style={a.partyLabel}>Contractor</Text>
            <Text style={a.partyName}>{ecomlanders.legalName}</Text>
            <Text style={a.partyDetail}>{ecomlanders.address}</Text>
            <Text style={a.partyDetail}>{ecomlanders.contactEmail}</Text>
          </View>
        </View>

        {/* Background */}
        <Text style={s.sectionHeading}>Background</Text>
        {backgroundClauses.map((clause, i) => (
          <View key={i} style={a.backgroundRow}>
            <Text style={a.backgroundLabel}>
              {String.fromCharCode(65 + i)}.
            </Text>
            <Text style={a.backgroundText}>{clause}</Text>
          </View>
        ))}
        <Text style={a.considerationText}>{considerationText}</Text>

        <View style={a.separator} />

        {/* Services Provided */}
        <Text style={s.sectionHeading}>Services Provided</Text>
        <Text style={[s.bodyText, { marginBottom: 8 }]}>
          The Client hereby agrees to engage the Contractor to provide the
          Client with the following services (the &quot;Services&quot;):
        </Text>
        {validDeliverables.map((d, i) => (
          <View key={i} style={a.bulletRow}>
            <Text style={a.bulletDot}>•</Text>
            <Text style={a.bulletText}>{d.description}</Text>
          </View>
        ))}
        <Text style={[s.bodyText, { marginTop: 8 }]}>
          The Services will also include any other tasks which the Parties may
          agree on. The Contractor hereby agrees to provide such Services to the
          Client.
        </Text>

        <PageFooter />
      </Page>

      {/* ──────── Page 3: Term, Timeline & Commercial Terms ──────── */}
      <Page size="A4" style={s.contentPage}>
        <ContentHeader clientName={data.clientName} />

        {/* Term of Agreement */}
        <Text style={s.sectionHeading}>Term of Agreement</Text>
        <Text style={s.bodyText}>
          The term of this Agreement (the &quot;Term&quot;) will begin on the
          date of this Agreement and will remain in full force and effect until
          the completion of the Services, subject to earlier termination as
          provided in this Agreement. The Term may be extended with the written
          consent of the Parties.
        </Text>
        <Text style={[s.bodyText, { marginTop: 8 }]}>
          In the event that either Party wishes to terminate this Agreement prior
          to the completion of the Services, that Party will be required to
          provide {ag.noticePeriod || "7 days"}&apos; written notice to the
          other Party.
        </Text>

        {/* Timeline */}
        <Text style={a.subHeading}>Timeline</Text>
        <View style={s.timelineRow}>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Agreement Start</Text>
            <Text style={s.timelineValue}>
              {formatDate(ag.agreementStartDate)}
            </Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Agreement End</Text>
            <Text style={s.timelineValue}>
              {formatDate(ag.agreementEndDate)}
            </Text>
          </View>
        </View>
        <View style={s.timelineRow}>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Project Start</Text>
            <Text style={s.timelineValue}>{formatDate(data.startDate)}</Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Estimated Project End</Text>
            <Text style={s.timelineValue}>{formatDate(data.endDate)}</Text>
          </View>
        </View>

        <View style={a.separator} />

        {/* Commercial Terms */}
        <Text style={s.sectionHeading}>Payment</Text>

        <View style={[a.termRow, a.termRowHighlight]}>
          <Text style={a.termLabel}>Payment Structure</Text>
          <Text style={a.termValue}>{ag.paymentStructure}</Text>
        </View>

        {ag.paymentStructure === "Fixed Project Fee" && (
          <>
            <View style={a.termRow}>
              <Text style={a.termLabel}>Total Fee</Text>
              <Text style={a.termValue}>{ag.totalFee}</Text>
            </View>
            {ag.deposit?.trim() && (
              <View style={a.termRow}>
                <Text style={a.termLabel}>Deposit</Text>
                <Text style={a.termValue}>{ag.deposit}</Text>
              </View>
            )}
          </>
        )}

        {ag.paymentStructure === "Monthly Retainer" && (
          <View style={a.termRow}>
            <Text style={a.termLabel}>Monthly Fee</Text>
            <Text style={a.termValue}>{ag.monthlyFee}</Text>
          </View>
        )}

        {ag.paymentStructure === "Milestone-Based" && (
          <>
            <Text style={a.subHeading}>Milestones</Text>
            <View style={s.tableHeader}>
              <View style={s.tableColNum}>
                <Text style={s.tableHeaderText}>#</Text>
              </View>
              <View style={a.milestoneColDesc}>
                <Text style={s.tableHeaderText}>Milestone</Text>
              </View>
              <View style={a.milestoneColAmount}>
                <Text style={[s.tableHeaderText, { textAlign: "right" }]}>
                  Amount
                </Text>
              </View>
            </View>
            {ag.milestones
              .filter((m) => m.description.trim())
              .map((m, i) => (
                <View
                  key={i}
                  style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <View style={s.tableColNum}>
                    <Text style={s.tableCellMuted}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={a.milestoneColDesc}>
                    <Text style={s.tableCellText}>{m.description}</Text>
                  </View>
                  <View style={a.milestoneColAmount}>
                    <Text style={[s.tableCellMuted, { textAlign: "right" }]}>
                      {m.amount || "—"}
                    </Text>
                  </View>
                </View>
              ))}
          </>
        )}

        <View style={a.termRow}>
          <Text style={a.termLabel}>Payment Terms</Text>
          <Text style={a.termValue}>{ag.paymentTerm}</Text>
        </View>

        <View style={a.termRow}>
          <Text style={a.termLabel}>Currency</Text>
          <Text style={a.termValue}>GBP</Text>
        </View>

        <View style={a.termRow}>
          <Text style={a.termLabel}>VAT</Text>
          <Text style={a.termValue}>Included</Text>
        </View>

        <View style={a.termRow}>
          <Text style={a.termLabel}>Quote Validity</Text>
          <Text style={a.termValue}>30 days from date of issue</Text>
        </View>

        {ag.additionalTerms.trim() && (
          <>
            <Text style={a.subHeading}>Additional Terms</Text>
            <Text style={s.bodyText}>{ag.additionalTerms}</Text>
          </>
        )}

        <PageFooter />
      </Page>

      {/* ──────── Standard Terms & Conditions (chunked pages) ──────── */}
      {(() => {
        /* Split 20 terms into pages that fit comfortably */
        const chunks: (typeof standardTerms)[] = [];
        const perPage = 4;
        for (let c = 0; c < standardTerms.length; c += perPage) {
          chunks.push(standardTerms.slice(c, c + perPage));
        }
        return chunks.map((chunk, pageIdx) => (
          <Page key={`terms-${pageIdx}`} size="A4" style={s.contentPage}>
            <ContentHeader clientName={data.clientName} />
            {pageIdx === 0 && (
              <Text style={s.sectionHeading}>
                Standard Terms &amp; Conditions
              </Text>
            )}
            {chunk.map((section) => {
              const num =
                standardTerms.indexOf(section) + 1;
              return (
                <View key={num} style={{ marginBottom: 12 }}>
                  <Text style={a.legalHeading}>
                    {num}. {section.heading}
                  </Text>
                  {section.clauses.map((clause, ci) => (
                    <Text key={ci} style={a.legalBody}>
                      {clause}
                    </Text>
                  ))}
                </View>
              );
            })}
            <PageFooter />
          </Page>
        ));
      })()}

      {/* ──────── Signature Page ──────── */}
      <Page size="A4" style={s.contentPage}>
        <ContentHeader clientName={data.clientName} />

        <Text style={s.sectionHeading}>Signatures</Text>
        <Text style={s.bodyText}>
          IN WITNESS WHEREOF the Parties have duly affixed their signatures under
          hand and seal on this {today}.
        </Text>

        <View style={a.sigRow}>
          {/* Ecom Landers signature */}
          <View style={a.sigBlock}>
            <Text style={a.sigLabel}>{ecomlanders.legalName}</Text>
            {ag.signature ? (
              <Image src={ag.signature} style={a.sigImage} />
            ) : (
              <View style={a.sigLine} />
            )}
            {ag.signerName ? (
              <Text style={a.sigFieldValue}>{ag.signerName}</Text>
            ) : (
              <View style={a.sigFieldLine} />
            )}
            <Text style={a.sigFieldLabel}>Officer&apos;s Name</Text>
            {ag.signerTitle ? (
              <Text style={a.sigFieldValue}>{ag.signerTitle}</Text>
            ) : (
              <View style={a.sigFieldLine} />
            )}
            <Text style={a.sigFieldLabel}>Title</Text>
            {ag.signerDate ? (
              <Text style={a.sigFieldValue}>{formatDate(ag.signerDate)}</Text>
            ) : (
              <View style={a.sigFieldLine} />
            )}
            <Text style={a.sigFieldLabel}>Date</Text>
          </View>

          {/* Client signature */}
          <View style={a.sigBlock}>
            <Text style={a.sigLabel}>{ag.clientLegalName}</Text>
            <View style={a.sigLine} />
            <View style={a.sigFieldLine} />
            <Text style={a.sigFieldLabel}>Officer&apos;s Name</Text>
            <View style={a.sigFieldLine} />
            <Text style={a.sigFieldLabel}>Title</Text>
            <View style={a.sigFieldLine} />
            <Text style={a.sigFieldLabel}>Date</Text>
          </View>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
