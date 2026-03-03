"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";
import type { RoadmapFormData } from "@/lib/config";
import { PdfLogo, formatDate, shared as s } from "@/lib/pdf-shared";
import {
  defaultPhaseDescriptions,
  computePhaseTouchpoints,
} from "@/lib/roadmap-defaults";
import { ecomlanders } from "@/lib/agreement-terms";

/* ── Helpers ── */

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/* ── Colours for the 6 Gantt bars (monochromatic, dark → light) ── */
const phaseColors = [
  "#0A0A0A",
  "#2A2A2A",
  "#4A4A4A",
  "#6B6B6B",
  "#8A8A8A",
  "#AAAAAA",
];

/* ── Gantt chart constants ── */
const CHART_LABEL_WIDTH = 105;
const CHART_AREA_WIDTH = 394;
const BAR_HEIGHT = 24;
const ROW_GAP = 6;

/* ── Local styles ── */
const r = StyleSheet.create({
  ganttContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  ganttRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ROW_GAP,
  },
  ganttLabel: {
    width: CHART_LABEL_WIDTH,
    fontSize: 8,
    fontWeight: 600,
    color: "#0A0A0A",
  },
  ganttTrack: {
    width: CHART_AREA_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: "#F5F5F5",
    position: "relative",
  },
  ganttBarText: {
    position: "absolute",
    top: 7,
    fontSize: 6.5,
    fontWeight: 500,
    color: "#FFFFFF",
  },
  monthAxisRow: {
    flexDirection: "row",
    marginLeft: CHART_LABEL_WIDTH,
    width: CHART_AREA_WIDTH,
    position: "relative",
    height: 14,
    marginTop: 2,
  },
  monthLabel: {
    position: "absolute",
    fontSize: 6.5,
    fontWeight: 500,
    color: "#AAAAAA",
  },

  /* Phase detail pages */
  phaseSubheading: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0A0A0A",
    marginBottom: 4,
    marginTop: 12,
  },
  phaseBlock: {
    marginBottom: 8,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  phaseDatesRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 4,
  },
  phaseDateItem: {},
  durationBadge: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6B6B6B",
  },
  phaseHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0A0A0A",
    letterSpacing: -0.3,
    marginBottom: 12,
    marginTop: 4,
  },

  /* Key Client Dates section */
  clientDatesSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5E5",
  },
  clientDatesHeading: {
    fontSize: 9,
    fontWeight: 700,
    color: "#AAAAAA",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  clientDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  clientDateBullet: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  clientDateDate: {
    width: 65,
    fontSize: 9,
    fontWeight: 600,
    color: "#0A0A0A",
  },
  clientDateLabel: {
    fontSize: 9,
    fontWeight: 400,
    color: "#6B6B6B",
  },

  /* Touchpoint dates row (for phase details) */
  touchpointRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  touchpointItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  touchpointLabel: {
    fontSize: 8,
    fontWeight: 500,
    color: "#6B6B6B",
  },
  touchpointDate: {
    fontSize: 8,
    fontWeight: 600,
    color: "#0A0A0A",
  },
});

/* ── Sub-components ── */

function ContentHeader({ clientName }: { clientName: string }) {
  return (
    <View style={s.pageHeader}>
      <PdfLogo height={8} color="#AAAAAA" />
      <Text style={s.pageHeaderClient}>{clientName}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>
        Confidential — for internal and client use only
      </Text>
    </View>
  );
}

/* ── Diamond milestone marker ── */

function DiamondMarker({
  size = 8,
  fill = "#FFFFFF",
  stroke = "#0A0A0A",
}: {
  size?: number;
  fill?: string;
  stroke?: string;
}) {
  const half = size / 2;
  const d = `M ${half} 0 L ${size} ${half} L ${half} ${size} L 0 ${half} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={d} fill={fill} stroke={stroke} strokeWidth={0.8} />
    </Svg>
  );
}

/* ── Main component ── */

export function RoadmapPdfDocument({ data }: { data: RoadmapFormData }) {
  const today = formatDate(new Date().toISOString().split("T")[0]);
  const year = new Date().getFullYear().toString();
  const phasesWithDates = data.phases.filter((p) => p.startDate);

  /* Gantt calculations */
  const allTimestamps = phasesWithDates.flatMap((p) => [
    new Date(p.startDate + "T00:00:00").getTime(),
    new Date((p.endDate || p.startDate) + "T00:00:00").getTime(),
  ]);
  const minDate = Math.min(...allTimestamps);
  const maxDate = Math.max(...allTimestamps);
  const totalSpan = maxDate - minDate || 1;

  const bars = data.phases.map((phase) => {
    const isPoint = phase.startDate === phase.endDate;
    const start = new Date(phase.startDate + "T00:00:00").getTime();
    const end = new Date(
      (phase.endDate || phase.startDate) + "T00:00:00"
    ).getTime();
    const leftPct = (start - minDate) / totalSpan;
    const widthPct = (end - start) / totalSpan;
    return {
      left: leftPct * CHART_AREA_WIDTH,
      width: isPoint ? 2 : Math.max(widthPct * CHART_AREA_WIDTH, 16),
      isPoint,
    };
  });

  /* Compute all touchpoints per phase */
  const phaseTouchpoints = data.phases.map((phase) =>
    computePhaseTouchpoints(phase)
  );

  /* Flatten all touchpoints with positions for the Gantt chart */
  const allTouchpoints = data.phases.flatMap((phase, phaseIdx) =>
    phaseTouchpoints[phaseIdx]
      .filter((tp) => tp.date)
      .map((tp) => {
        const ts = new Date(tp.date + "T00:00:00").getTime();
        const leftPos = ((ts - minDate) / totalSpan) * CHART_AREA_WIDTH;
        return {
          ...tp,
          phaseIdx,
          left: Math.max(0, Math.min(leftPos, CHART_AREA_WIDTH - 8)),
        };
      })
  );

  /* Month markers */
  const months: { label: string; left: number }[] = [];
  if (phasesWithDates.length > 0) {
    const startD = new Date(minDate);
    const endD = new Date(maxDate);
    const cursor = new Date(startD.getFullYear(), startD.getMonth() + 1, 1);
    while (cursor <= endD) {
      const ts = cursor.getTime();
      const pos = ((ts - minDate) / totalSpan) * CHART_AREA_WIDTH;
      months.push({
        label: cursor.toLocaleDateString("en-GB", { month: "short" }),
        left: pos,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  /* Chunk phases into pages of 3 */
  const detailChunks: (typeof data.phases)[] = [];
  for (let i = 0; i < data.phases.length; i += 3) {
    detailChunks.push(data.phases.slice(i, i + 3));
  }

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
          <Text style={s.coverSubtitle}>Project Roadmap</Text>
        </View>

        <View style={s.coverFooter}>
          <View style={s.coverRule} />
          <View style={s.coverFooterRow}>
            <View style={s.coverFooterLeft}>
              <Text style={s.coverYear}>{year}</Text>
              <Text style={s.coverArrow}>→</Text>
            </View>
            <Text style={s.coverFooterRight}>Project Roadmap</Text>
          </View>
        </View>
      </Page>

      {/* ──────── Page 2: Timeline Overview ──────── */}
      <Page size="A4" style={s.contentPage}>
        <ContentHeader clientName={data.clientName} />

        <Text style={s.sectionHeading}>Project Timeline</Text>

        {/* Overview stats */}
        <View style={s.timelineRow}>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Project Start</Text>
            <Text style={s.timelineValue}>
              {formatDate(data.phases[0]?.startDate)}
            </Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Project End</Text>
            <Text style={s.timelineValue}>
              {formatDate(
                data.phases[data.phases.length - 1]?.endDate ||
                  data.phases[data.phases.length - 1]?.startDate
              )}
            </Text>
          </View>
          <View style={s.timelineItem}>
            <Text style={s.timelineLabel}>Project Type</Text>
            <Text style={s.timelineValue}>{data.projectType || "—"}</Text>
          </View>
        </View>

        {/* Gantt chart */}
        <View style={r.ganttContainer}>
          {data.phases.map((phase, i) => {
            const phaseTps = allTouchpoints.filter(
              (tp) => tp.phaseIdx === i
            );

            return (
              <View key={phase.name} style={r.ganttRow}>
                <Text style={r.ganttLabel}>{phase.name}</Text>
                <View style={r.ganttTrack}>
                  {/* Phase bar or point marker */}
                  {bars[i].isPoint ? (
                    /* Vertical line for single-date phases */
                    <View
                      style={{
                        position: "absolute" as const,
                        left: bars[i].left - 1,
                        top: 0,
                        width: 2,
                        height: BAR_HEIGHT,
                        backgroundColor: phaseColors[i],
                      }}
                    />
                  ) : (
                    /* Normal bar for range phases */
                    <View
                      style={{
                        position: "absolute" as const,
                        left: bars[i].left,
                        top: 0,
                        width: bars[i].width,
                        height: BAR_HEIGHT,
                        backgroundColor: phaseColors[i],
                      }}
                    />
                  )}

                  {/* Bar date text (only for range phases with enough width) */}
                  {!bars[i].isPoint && bars[i].width > 55 && (
                    <Text
                      style={[
                        r.ganttBarText,
                        {
                          left:
                            bars[i].left +
                            (phaseTps.length > 0 ? 17 : 5),
                        },
                      ]}
                    >
                      {formatShortDate(phase.startDate)} –{" "}
                      {formatShortDate(phase.endDate)}
                    </Text>
                  )}

                  {/* Diamond milestone markers for this phase */}
                  {phaseTps.map((tp, tpIdx) => (
                    <View
                      key={tpIdx}
                      style={{
                        position: "absolute" as const,
                        left: tp.left - 4,
                        top: (BAR_HEIGHT - 8) / 2,
                        width: 8,
                        height: 8,
                      }}
                    >
                      <DiamondMarker
                        size={8}
                        fill="#FFFFFF"
                        stroke="#0A0A0A"
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Month axis markers */}
          {months.length > 0 && (
            <View style={r.monthAxisRow}>
              {months.map((m, i) => (
                <Text key={i} style={[r.monthLabel, { left: m.left }]}>
                  {m.label}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: "row" as const,
            flexWrap: "wrap" as const,
            gap: 16,
            marginTop: 16,
          }}
        >
          {data.phases.map((phase, i) => (
            <View
              key={phase.name}
              style={{
                flexDirection: "row" as const,
                alignItems: "center" as const,
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: phaseColors[i],
                }}
              />
              <Text
                style={{ fontSize: 7.5, fontWeight: 500, color: "#6B6B6B" }}
              >
                {phase.name}
              </Text>
            </View>
          ))}
          <View
            style={{
              flexDirection: "row" as const,
              alignItems: "center" as const,
              gap: 6,
            }}
          >
            <View
              style={{
                width: 10,
                alignItems: "center" as const,
                justifyContent: "center" as const,
              }}
            >
              <DiamondMarker size={8} fill="#FFFFFF" stroke="#0A0A0A" />
            </View>
            <Text
              style={{ fontSize: 7.5, fontWeight: 500, color: "#6B6B6B" }}
            >
              Client Touchpoint
            </Text>
          </View>
        </View>

        {/* Key Client Dates */}
        <View style={r.clientDatesSection}>
          <Text style={r.clientDatesHeading}>KEY CLIENT DATES</Text>
          {[...allTouchpoints]
            .sort(
              (a, b) =>
                new Date(a.date + "T00:00:00").getTime() -
                new Date(b.date + "T00:00:00").getTime()
            )
            .map((tp, i) => (
              <View key={i} style={r.clientDateRow}>
                <View style={r.clientDateBullet}>
                  <DiamondMarker size={5} fill="#0A0A0A" stroke="#0A0A0A" />
                </View>
                <Text style={r.clientDateDate}>
                  {formatShortDate(tp.date)}
                </Text>
                <Text style={r.clientDateLabel}>{tp.label}</Text>
              </View>
            ))}
        </View>

        <PageFooter />
      </Page>

      {/* ──────── Phase Detail Pages (3 per page) ──────── */}
      {detailChunks.map((chunk, pageIdx) => (
        <Page key={`detail-${pageIdx}`} size="A4" style={s.contentPage}>
          <ContentHeader clientName={data.clientName} />

          {pageIdx === 0 && (
            <Text style={s.sectionHeading}>Phase Details</Text>
          )}

          {chunk.map((phase) => {
            const globalIdx = data.phases.indexOf(phase);
            const isPoint = phase.startDate === phase.endDate;
            const duration = isPoint
              ? 0
              : daysBetween(phase.startDate, phase.endDate);
            const defaults = defaultPhaseDescriptions[phase.name];
            const touchpoints = phaseTouchpoints[globalIdx];

            return (
              <View key={phase.name} style={r.phaseBlock}>
                <Text style={r.phaseHeading}>
                  {String(globalIdx + 1).padStart(2, "0")}. {phase.name}
                </Text>

                {/* Dates row */}
                <View style={r.phaseDatesRow}>
                  {isPoint ? (
                    <View style={r.phaseDateItem}>
                      <Text style={s.timelineLabel}>Date</Text>
                      <Text style={s.timelineValue}>
                        {formatDate(phase.startDate)}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={r.phaseDateItem}>
                        <Text style={s.timelineLabel}>Start</Text>
                        <Text style={s.timelineValue}>
                          {formatDate(phase.startDate)}
                        </Text>
                      </View>
                      <View style={r.phaseDateItem}>
                        <Text style={s.timelineLabel}>End</Text>
                        <Text style={s.timelineValue}>
                          {formatDate(phase.endDate)}
                        </Text>
                      </View>
                      <View style={r.phaseDateItem}>
                        <Text style={s.timelineLabel}>Duration</Text>
                        <Text style={r.durationBadge}>
                          {duration} day{duration !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* What happens */}
                <Text style={r.phaseSubheading}>What Happens</Text>
                <Text style={[s.bodyText, { marginBottom: 4 }]}>
                  {phase.description}
                </Text>

                {/* Client involvement */}
                <Text style={r.phaseSubheading}>Your Involvement</Text>
                <Text style={[s.bodyText, { marginBottom: 4 }]}>
                  {defaults.clientTouchpoint}
                </Text>

                {/* Touchpoint dates */}
                {touchpoints.length > 0 && (
                  <>
                    <Text style={r.phaseSubheading}>Key Dates</Text>
                    <View style={r.touchpointRow}>
                      {touchpoints.map((tp, tpIdx) => (
                        <View key={tpIdx} style={r.touchpointItem}>
                          <Text style={r.touchpointLabel}>{tp.label}:</Text>
                          <Text style={r.touchpointDate}>
                            {formatShortDate(tp.date)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Notes */}
                {phase.notes.trim() && (
                  <>
                    <Text style={r.phaseSubheading}>Notes</Text>
                    <Text style={[s.bodyText, { marginBottom: 4 }]}>
                      {phase.notes}
                    </Text>
                  </>
                )}
              </View>
            );
          })}

          <PageFooter />
        </Page>
      ))}

      {/* ──────── Final Page: Sign-off ──────── */}
      <Page size="A4" style={s.contentPage}>
        <ContentHeader clientName={data.clientName} />

        <Text style={s.sectionHeading}>Next Steps</Text>
        <Text style={s.bodyText}>
          This roadmap outlines the key phases and milestones for your project.
          Throughout each phase, we&apos;ll keep you updated on progress and
          flag anything that needs your attention. If you have any questions
          about the timeline or process, please don&apos;t hesitate to reach
          out.
        </Text>

        <View style={s.signoffSection}>
          <Text style={s.signoffText}>
            Prepared by {ecomlanders.legalName}
          </Text>
          <Text style={s.signoffDate}>{today}</Text>
        </View>

        <PageFooter />
      </Page>
    </Document>
  );
}
