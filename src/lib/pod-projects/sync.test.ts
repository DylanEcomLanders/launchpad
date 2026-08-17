import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DocSection, PodDoc } from "./types.ts";
import { bodyScore, isCloudNewer, mergePodDocs, pickRicherBody } from "./sync.ts";

const BRIEF_BLOCK = `<h3>Page: <em>e.g. Homepage</em></h3>
<p><strong>Objective:</strong> <em>The one outcome this page drives…</em></p>
<p><strong>Brief:</strong> <em>What we're doing and why…</em></p>
<p><strong>Deliverables:</strong></p>
<ul><li><em>…</em></li></ul>
<p><strong>Notes / links:</strong> <em>…</em></p>`;

const TEMPLATE_BRIEF = `<p><em>One brief per client page you're working on — add as many as you need.</em></p>
${BRIEF_BLOCK}`;

const TWO_EMPTY_BLOCKS = `${TEMPLATE_BRIEF}${BRIEF_BLOCK}`;

const FILLED_BRIEF = `<p>Rosabella homepage: cut PDP bounce and lift ATC.</p>
<h3>Page: Homepage</h3>
<p><strong>Objective:</strong> Get first-time visitors to a product in under two clicks.</p>
<p><strong>Brief:</strong> Rebuild the hero around the 3-kit offer, drop the carousel, add social proof above the fold.</p>
<p><strong>Deliverables:</strong></p>
<ul><li>Hero rewrite + kit cards</li><li>Sticky ATC on mobile</li></ul>
<p><strong>Notes / links:</strong> Figma: https://example.com/file</p>`;

function section(id: string, title: string, body: string, children?: DocSection[]): DocSection {
  return { id, title, body, children };
}

function doc(partial: Partial<PodDoc> & Pick<PodDoc, "id" | "updated_at" | "sections">): PodDoc {
  return {
    podId: "pod-2",
    title: "Client",
    type: "retainer",
    created_at: "2026-08-01T00:00:00.000Z",
    ...partial,
  };
}

describe("isCloudNewer", () => {
  it("treats a later ISO timestamp as newer", () => {
    assert.equal(isCloudNewer("2026-08-17T09:44:00.000Z", "2026-08-12T10:00:00.000Z"), true);
    assert.equal(isCloudNewer("2026-08-12T10:00:00.000Z", "2026-08-17T09:44:00.000Z"), false);
  });

  it("does not treat an equal revision as newer (same-tab save / intentional delete)", () => {
    assert.equal(isCloudNewer("2026-08-17T09:44:00.000Z", "2026-08-17T09:44:00.000Z"), false);
  });
});

describe("pickRicherBody", () => {
  it("keeps a filled strategy brief over the empty template skeleton", () => {
    assert.equal(pickRicherBody(TWO_EMPTY_BLOCKS, FILLED_BRIEF), FILLED_BRIEF);
    assert.equal(pickRicherBody(FILLED_BRIEF, TWO_EMPTY_BLOCKS), FILLED_BRIEF);
  });

  it("keeps extra page-brief blocks when both sides are template-like", () => {
    assert.equal(pickRicherBody(BRIEF_BLOCK, TWO_EMPTY_BLOCKS), TWO_EMPTY_BLOCKS);
  });

  it("scores template copy far below a filled brief", () => {
    assert.ok(bodyScore(FILLED_BRIEF) > bodyScore(TWO_EMPTY_BLOCKS) * 3);
  });
});

describe("mergePodDocs — stale tab cannot wipe a newer brief", () => {
  const briefId = "first-week-wins/strategy-brief";

  function clientDoc(updatedAt: string, briefBody: string, extraChildren: DocSection[] = []): PodDoc {
    return doc({
      id: "doc-msd1ybry-1",
      title: "Rosabella",
      updated_at: updatedAt,
      sections: [
        section("overview", "Overview", "<p>Overview</p>"),
        section("first-week-wins", "First Week Wins", "", [
          section(briefId, "Strategy Brief", briefBody),
          section("first-week-wins/roadmap", "30-Day Roadmap", "<p>Roadmap</p>"),
          ...extraChildren,
        ]),
        section("reports", "Reports", "", [section("reports/week-1", "Week 1", "<p>Week 1</p>")]),
      ],
    });
  }

  it("keeps a filled cloud brief when a stale tab only edited another section", () => {
    const cloud = clientDoc("2026-08-17T09:44:23.000Z", FILLED_BRIEF);
    const stale = clientDoc("2026-08-12T08:00:00.000Z", TWO_EMPTY_BLOCKS);
    stale.sections = stale.sections.map((s) =>
      s.id === "overview" ? { ...s, body: "<p>Barnaby typed in Overview</p>" } : s,
    );
    const merged = mergePodDocs(stale, cloud);
    const wins = merged.sections.find((s) => s.id === "first-week-wins")?.children ?? [];
    const overview = merged.sections.find((s) => s.id === "overview");
    assert.equal(wins.find((s) => s.id === briefId)?.body, FILLED_BRIEF);
    assert.equal(overview?.body, "<p>Barnaby typed in Overview</p>");
  });

  it("keeps the newer cloud brief when a stale tab saves the empty template", () => {
    const cloud = clientDoc("2026-08-17T09:44:00.000Z", FILLED_BRIEF);
    const stale = clientDoc("2026-08-12T08:00:00.000Z", TWO_EMPTY_BLOCKS);
    assert.equal(isCloudNewer(cloud.updated_at, stale.updated_at), true);

    const merged = mergePodDocs(stale, cloud);
    const brief = merged.sections
      .find((s) => s.id === "first-week-wins")
      ?.children?.find((s) => s.id === briefId);
    assert.equal(brief?.body, FILLED_BRIEF);
  });

  it("keeps a filled local brief when cloud only has the template (offline catch-up)", () => {
    const cloud = clientDoc("2026-08-17T09:44:00.000Z", TWO_EMPTY_BLOCKS);
    const local = clientDoc("2026-08-17T09:40:00.000Z", FILLED_BRIEF);
    const merged = mergePodDocs(local, cloud);
    const brief = merged.sections
      .find((s) => s.id === "first-week-wins")
      ?.children?.find((s) => s.id === briefId);
    assert.equal(brief?.body, FILLED_BRIEF);
  });

  it("does not drop custom sections or extra report children from either side", () => {
    const cloud = clientDoc("2026-08-17T09:44:00.000Z", FILLED_BRIEF, [
      section("first-week-wins/custom", "Aanchal notes", "<p>Keep me</p>"),
    ]);
    const stale = clientDoc("2026-08-12T08:00:00.000Z", TWO_EMPTY_BLOCKS);
    stale.sections = stale.sections.map((s) =>
      s.id === "reports"
        ? { ...s, children: [...(s.children ?? []), section("reports/week-9", "Week 9", "<p>Custom week</p>")] }
        : s,
    );

    const merged = mergePodDocs(stale, cloud);
    const wins = merged.sections.find((s) => s.id === "first-week-wins")?.children ?? [];
    const reports = merged.sections.find((s) => s.id === "reports")?.children ?? [];
    assert.ok(wins.some((s) => s.id === "first-week-wins/custom" && s.body.includes("Keep me")));
    assert.ok(reports.some((s) => s.id === "reports/week-9" && s.body.includes("Custom week")));
    assert.ok(wins.some((s) => s.id === briefId && s.body === FILLED_BRIEF));
  });

  it("keeps local metadata (title / delete) while taking richer section bodies from cloud", () => {
    const cloud = clientDoc("2026-08-17T09:44:00.000Z", FILLED_BRIEF);
    const stale = { ...clientDoc("2026-08-12T08:00:00.000Z", TWO_EMPTY_BLOCKS), title: "Rosabella renamed", deleted_at: "2026-08-17T10:00:00.000Z" };
    const merged = mergePodDocs(stale, cloud);
    assert.equal(merged.title, "Rosabella renamed");
    assert.equal(merged.deleted_at, "2026-08-17T10:00:00.000Z");
    const brief = merged.sections.find((s) => s.id === "first-week-wins")?.children?.find((s) => s.id === briefId);
    assert.equal(brief?.body, FILLED_BRIEF);
  });

  it("clears deleted_at when the local write is a restore", () => {
    const cloud = { ...clientDoc("2026-08-17T09:44:00.000Z", FILLED_BRIEF), deleted_at: "2026-08-17T10:00:00.000Z" };
    const local = clientDoc("2026-08-17T09:44:00.000Z", FILLED_BRIEF);
    const merged = mergePodDocs(local, cloud);
    assert.equal(merged.deleted_at, undefined);
  });
});
