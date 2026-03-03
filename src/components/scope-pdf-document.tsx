"use client";

import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ScopeFormData } from "@/lib/config";
import { PdfLogo, formatDate, shared as s } from "@/lib/pdf-shared";

export function ScopePdfDocument({ data }: { data: ScopeFormData }) {
  const validDeliverables = data.deliverables.filter(
    (d) => d.description.trim()
  );
  const hasNotes = data.additionalNotes.trim().length > 0;
  const today = formatDate(new Date().toISOString().split("T")[0]);
  const disclaimer =
    "All dates provided are estimates based on the project running to plan. Any mid-scope changes, delays in feedback, or communication gaps may extend the outlined timelines.";

  return (
    <Document>
      {/* Page 1: Cover */}
      <Page size="A4" style={s.coverPage}>
        {/* Decorative blocks */}
        <View style={s.decoBlock1} />
        <View style={s.decoBlock2} />
        <View style={s.decoBlock3} />
        <View style={s.decoBlock4} />

        {/* Logo */}
        <PdfLogo height={14} />

        {/* Title area */}
        <View style={s.coverBody}>
          <Text style={s.coverTitle}>
            Ecomlanders × {data.clientName}
          </Text>
          <Text style={s.coverSubtitle}>{data.projectType}</Text>
        </View>

        {/* Footer */}
        <View style={s.coverFooter}>
          <View style={s.coverRule} />
          <View style={s.coverFooterRow}>
            <View style={s.coverFooterLeft}>
              <Text style={s.coverYear}>2026</Text>
              <Text style={s.coverArrow}>→</Text>
            </View>
            <Text style={s.coverFooterRight}>Project Overview</Text>
          </View>
        </View>
      </Page>

      {/* Page 2: Project Details */}
      <Page size="A4" style={s.contentPage}>
        {/* Header */}
        <View style={s.pageHeader}>
          <PdfLogo height={8} color="#AAAAAA" />
          <Text style={s.pageHeaderClient}>{data.clientName}</Text>
        </View>

        {/* Overview */}
        <Text style={s.sectionHeading}>Project Overview</Text>
        <Text style={s.bodyText}>{data.projectOverview}</Text>

        {/* Timeline */}
        <View style={s.timelineRow}>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Start Date</Text>
            <Text style={s.timelineValue}>{formatDate(data.startDate)}</Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>End Date</Text>
            <Text style={s.timelineValue}>{formatDate(data.endDate)}</Text>
          </View>
        </View>

        {/* Deliverables */}
        <Text style={s.sectionHeading}>Deliverables</Text>

        {/* Table header */}
        <View style={s.tableHeader}>
          <View style={s.tableColNum}>
            <Text style={s.tableHeaderText}>#</Text>
          </View>
          <View style={s.tableColDesc}>
            <Text style={s.tableHeaderText}>Deliverable</Text>
          </View>
          <View style={s.tableColType}>
            <Text style={[s.tableHeaderText, { textAlign: "right" }]}>
              Type
            </Text>
          </View>
        </View>

        {/* Table rows */}
        {validDeliverables.map((d, i) => (
          <View
            key={i}
            style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
          >
            <View style={s.tableColNum}>
              <Text style={s.tableCellMuted}>
                {String(i + 1).padStart(2, "0")}
              </Text>
            </View>
            <View style={s.tableColDesc}>
              <Text style={s.tableCellText}>{d.description}</Text>
            </View>
            <View style={s.tableColType}>
              <Text style={[s.tableCellMuted, { textAlign: "right" }]}>
                {d.type || "—"}
              </Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Confidential — for internal and client use only
          </Text>
          <Text style={s.disclaimer}>{disclaimer}</Text>
        </View>
      </Page>

      {/* Page 3: Notes & Sign-off (if notes exist) */}
      {hasNotes && (
        <Page size="A4" style={s.contentPage}>
          {/* Header */}
          <View style={s.pageHeader}>
            <PdfLogo height={8} color="#AAAAAA" />
            <Text style={s.pageHeaderClient}>{data.clientName}</Text>
          </View>

          <Text style={s.sectionHeading}>Additional Notes</Text>
          <Text style={s.bodyText}>{data.additionalNotes}</Text>

          {/* Sign-off */}
          <View style={s.signoffSection}>
            <Text style={s.signoffText}>Prepared by Ecomlanders</Text>
            <Text style={s.signoffDate}>{today}</Text>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              Confidential — for internal and client use only
            </Text>
            <Text style={s.disclaimer}>{disclaimer}</Text>
          </View>
        </Page>
      )}

      {/* If no notes, add sign-off footer on last page instead */}
      {!hasNotes && (
        <Page size="A4" style={s.contentPage}>
          <View style={s.pageHeader}>
            <PdfLogo height={8} color="#AAAAAA" />
            <Text style={s.pageHeaderClient}>{data.clientName}</Text>
          </View>

          <View style={s.signoffSection}>
            <Text style={s.signoffText}>Prepared by Ecomlanders</Text>
            <Text style={s.signoffDate}>{today}</Text>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>
              Confidential — for internal and client use only
            </Text>
            <Text style={s.disclaimer}>{disclaimer}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
