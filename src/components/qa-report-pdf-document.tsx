"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { qaCategories, type QAFormData, type QAItem } from "@/lib/config";
import { PdfLogo, formatDate, shared as s } from "@/lib/pdf-shared";

const q = StyleSheet.create({
  resultPass: { fontSize: 9, fontWeight: 700, color: "#059669" },
  resultFail: { fontSize: 9, fontWeight: 700, color: "#dc2626" },
  resultSkip: { fontSize: 9, fontWeight: 400, color: "#999999" },
  catHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 6,
    marginTop: 20,
  },
  catStats: {
    fontSize: 9,
    fontWeight: 400,
    color: "#6B6B6B",
    marginBottom: 10,
  },
  colCheck: { flex: 1 },
  colResult: { width: 50, textAlign: "right" },
  colNotes: { width: 140, textAlign: "right" },
  notesText: { fontSize: 8.5, fontWeight: 400, color: "#999999" },
  summaryBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderWidth: 0.5,
    borderColor: "#E5E5E5",
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  summaryText: { fontSize: 10, fontWeight: 400, color: "#3A3A3A", lineHeight: 1.6 },
  verdictPass: {
    fontSize: 22,
    fontWeight: 800,
    color: "#059669",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  verdictFail: {
    fontSize: 22,
    fontWeight: 800,
    color: "#dc2626",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  verdictIncomplete: {
    fontSize: 22,
    fontWeight: 800,
    color: "#d97706",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  statItem: {},
  statValue: { fontSize: 20, fontWeight: 800, color: "#0A0A0A" },
  statLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: "#6B6B6B",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
});

export function QaReportPdfDocument({ data }: { data: QAFormData }) {
  const checkedItems = data.items.filter((i) => i.result !== "");
  const pass = data.items.filter((i) => i.result === "pass").length;
  const fail = data.items.filter((i) => i.result === "fail").length;
  const skip = data.items.filter((i) => i.result === "skip").length;
  const unchecked = data.items.length - checkedItems.length;
  const verdict = fail > 0 ? "FAIL" : unchecked === 0 ? "PASS" : "INCOMPLETE";
  const today = formatDate(data.testDate || new Date().toISOString().split("T")[0]);

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.decoBlock1} />
        <View style={s.decoBlock2} />
        <View style={s.decoBlock3} />
        <View style={s.decoBlock4} />
        <PdfLogo height={14} />
        <View style={s.coverBody}>
          <Text style={s.coverTitle}>
            {data.clientName} — QA Report
          </Text>
          <Text style={s.coverSubtitle}>{data.projectName}</Text>
        </View>
        <View style={s.coverFooter}>
          <View style={s.coverRule} />
          <View style={s.coverFooterRow}>
            <View style={s.coverFooterLeft}>
              <Text style={s.coverYear}>{today}</Text>
              <Text style={s.coverArrow}>→</Text>
            </View>
            <Text style={s.coverFooterRight}>Quality Assurance</Text>
          </View>
        </View>
      </Page>

      {/* Summary page */}
      <Page size="A4" style={s.contentPage}>
        <View style={s.pageHeader}>
          <PdfLogo height={8} color="#AAAAAA" />
          <Text style={s.pageHeaderClient}>{data.clientName}</Text>
        </View>

        <Text style={s.sectionHeading}>Summary</Text>

        <Text
          style={
            verdict === "PASS"
              ? q.verdictPass
              : verdict === "FAIL"
                ? q.verdictFail
                : q.verdictIncomplete
          }
        >
          {verdict}
        </Text>

        <View style={q.statRow}>
          <View style={q.statItem}>
            <Text style={q.statValue}>{pass}</Text>
            <Text style={q.statLabel}>Passed</Text>
          </View>
          <View style={q.statItem}>
            <Text style={q.statValue}>{fail}</Text>
            <Text style={q.statLabel}>Failed</Text>
          </View>
          <View style={q.statItem}>
            <Text style={q.statValue}>{skip}</Text>
            <Text style={q.statLabel}>Skipped</Text>
          </View>
          <View style={q.statItem}>
            <Text style={q.statValue}>{unchecked}</Text>
            <Text style={q.statLabel}>Unchecked</Text>
          </View>
        </View>

        <View style={s.timelineRow}>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Tester</Text>
            <Text style={s.timelineValue}>{data.testerName}</Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Date</Text>
            <Text style={s.timelineValue}>{today}</Text>
          </View>
          {data.projectType && (
            <View style={s.timelineItem}>
              <Text style={s.timelineLabel}>Project Type</Text>
              <Text style={s.timelineValue}>{data.projectType}</Text>
            </View>
          )}
        </View>

        {data.summary.trim() && (
          <View style={q.summaryBox}>
            <Text style={q.summaryLabel}>Notes</Text>
            <Text style={q.summaryText}>{data.summary}</Text>
          </View>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>Confidential — for internal use only</Text>
        </View>
      </Page>

      {/* Detail pages — one per category with checked items */}
      {qaCategories.map((category) => {
        const catItems = data.items.filter((i) => i.category === category && i.result !== "");
        if (catItems.length === 0) return null;

        const catPass = catItems.filter((i) => i.result === "pass").length;
        const catFail = catItems.filter((i) => i.result === "fail").length;
        const catSkip = catItems.filter((i) => i.result === "skip").length;

        return (
          <Page key={category} size="A4" style={s.contentPage}>
            <View style={s.pageHeader}>
              <PdfLogo height={8} color="#AAAAAA" />
              <Text style={s.pageHeaderClient}>{data.clientName}</Text>
            </View>

            <Text style={q.catHeading}>{category}</Text>
            <Text style={q.catStats}>
              {catPass} pass · {catFail} fail · {catSkip} skip
            </Text>

            {/* Table header */}
            <View style={s.tableHeader}>
              <View style={s.tableColNum}>
                <Text style={s.tableHeaderText}>#</Text>
              </View>
              <View style={q.colCheck}>
                <Text style={s.tableHeaderText}>Check</Text>
              </View>
              <View style={q.colResult}>
                <Text style={[s.tableHeaderText, { textAlign: "right" }]}>Result</Text>
              </View>
              <View style={q.colNotes}>
                <Text style={[s.tableHeaderText, { textAlign: "right" }]}>Notes</Text>
              </View>
            </View>

            {catItems.map((item: QAItem, i: number) => (
              <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <View style={s.tableColNum}>
                  <Text style={s.tableCellMuted}>{String(i + 1).padStart(2, "0")}</Text>
                </View>
                <View style={q.colCheck}>
                  <Text style={s.tableCellText}>{item.description}</Text>
                </View>
                <View style={q.colResult}>
                  <Text
                    style={[
                      item.result === "pass"
                        ? q.resultPass
                        : item.result === "fail"
                          ? q.resultFail
                          : q.resultSkip,
                      { textAlign: "right" },
                    ]}
                  >
                    {item.result.toUpperCase()}
                  </Text>
                </View>
                <View style={q.colNotes}>
                  <Text style={[q.notesText, { textAlign: "right" }]}>
                    {item.notes || "—"}
                  </Text>
                </View>
              </View>
            ))}

            <View style={s.footer}>
              <Text style={s.footerText}>Confidential — for internal use only</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
