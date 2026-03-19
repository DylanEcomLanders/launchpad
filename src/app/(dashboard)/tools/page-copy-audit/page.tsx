"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";
import { toFigmaEmbed } from "@/lib/portal/review-types";

type AuditSection = {
  name: string;
  score: number;
  working: string[];
  issues: string[];
  rewrites: { before: string; after: string }[];
  vocInsight?: string;
};

type AuditResult = {
  sections: AuditSection[];
  overallScore: number;
  grade: string;
  topPriorities: string[];
  vocData?: {
    painPoints: string[];
    objections: string[];
    keyPhrases: string[];
  };
};

const gradeColor = (grade: string) => {
  if (grade === "A") return "text-emerald-600 bg-emerald-50";
  if (grade === "B") return "text-blue-600 bg-blue-50";
  if (grade === "C") return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const scoreColor = (score: number) => {
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-500";
};

const scoreBar = (score: number) => {
  const pct = score * 10;
  const bg = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${scoreColor(score)}`}>{score}/10</span>
    </div>
  );
};

export default function PageCopyAuditPage() {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productType, setProductType] = useState("");
  const [niche, setNiche] = useState("");
  const [includeVoc, setIncludeVoc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  const embedUrl = figmaUrl ? toFigmaEmbed(figmaUrl) : null;

  const handleAudit = async () => {
    if (!figmaUrl.trim()) return;
    setLoading(true);
    setResult(null);

    // Simulate audit (in production, this would call an AI API)
    await new Promise((r) => setTimeout(r, 2500));

    // Demo result — in production, AI would analyse the Figma design
    const demoResult: AuditResult = {
      sections: [
        {
          name: "Hero Section",
          score: 6,
          working: [
            "Headline is visible and prominent",
            "Subhead provides supporting context",
          ],
          issues: [
            "Headline leads with product name instead of customer outcome",
            "No specific promise or timeline in the hero",
            "Missing social proof bar beneath hero",
          ],
          rewrites: [
            {
              before: "Introducing [Product Name] — The Ultimate Formula",
              after: "Finally, [specific outcome] without [common frustration]",
            },
            {
              before: "Shop Now",
              after: "Start Your 7-Day Trial — Risk Free",
            },
          ],
          vocInsight: includeVoc ? "Customers frequently mention wanting to 'simplify their routine' — use this language in the hero hook." : undefined,
        },
        {
          name: "Benefit Callouts",
          score: 5,
          working: [
            "Benefits are present on the page",
          ],
          issues: [
            "Callouts use full sentences instead of 4-8 word phrases",
            "Leading with ingredients instead of outcomes",
            "No icons or emojis to aid scanning",
            "Structure is not parallel — mixing nouns and verbs",
          ],
          rewrites: [
            {
              before: "Contains powerful antioxidants that may help support your immune system",
              after: "Immune defence in every scoop",
            },
            {
              before: "Made with premium quality ingredients for energy",
              after: "Sustained energy & focus",
            },
          ],
        },
        {
          name: "Product Description",
          score: 7,
          working: [
            "Explains what the product is clearly",
            "Mentions who it's for",
          ],
          issues: [
            "Missing trust signal (no certification or testing mentioned)",
            "No closing hook connecting to daily life",
            "Slightly over 150 words — could be tighter",
          ],
          rewrites: [
            {
              before: "Our premium formula is designed for optimal results",
              after: "Third-party tested against 500+ contaminants. Mix one scoop, feel the difference by day 7.",
            },
          ],
        },
        {
          name: "Trust & Social Proof",
          score: 4,
          working: [
            "Has some customer reviews",
          ],
          issues: [
            "No review count or star rating visible above the fold",
            "Missing expert endorsement with specific credentials",
            "No third-party certifications named",
            "Guarantee buried in footer instead of near CTA",
            "Reviews lack specificity — 'I love it!' doesn't convert",
          ],
          rewrites: [
            {
              before: "Customers love our product",
              after: "12,500+ verified 5-star reviews",
            },
            {
              before: "Satisfaction guaranteed",
              after: "100% refund within 90 days — no questions asked",
            },
          ],
        },
        {
          name: "Page Flow & Architecture",
          score: 6,
          working: [
            "Has a clear hero → benefits → CTA structure",
            "CTA is visible",
          ],
          issues: [
            "Missing comparison table vs alternatives",
            "No results timeline (Week 1, Month 1, Month 2+)",
            "FAQ section doesn't address key objection categories",
            "Subscription value stack doesn't clearly beat one-time option",
          ],
          rewrites: [],
        },
        {
          name: "Tone & Voice",
          score: 7,
          working: [
            "Generally warm and approachable",
            "Avoids overly corporate language in most sections",
          ],
          issues: [
            "Uses 'premium' and 'high-quality' without backing them",
            "Some passive voice in product description",
            "Science section is too jargon-heavy — needs translation to plain language",
          ],
          rewrites: [
            {
              before: "Our premium, high-quality ingredients have been carefully selected",
              after: "Every ingredient is third-party tested and dosed based on clinical research",
            },
          ],
        },
      ],
      overallScore: 5.8,
      grade: "C",
      topPriorities: [
        "Add social proof at scale above the fold — review count + star rating immediately builds trust",
        "Rewrite hero to lead with customer outcome, not product name — this is the single biggest conversion lever",
        "Surface the guarantee near the CTA, not in the footer — risk reversal removes the final purchase barrier",
      ],
      vocData: includeVoc
        ? {
            painPoints: [
              '"I was taking 6 different supplements every morning — it was a nightmare"',
              '"I never know if these things actually work or if I\'m wasting money"',
              '"The taste of most greens powders is absolutely horrible"',
            ],
            objections: [
              '"Is this actually third-party tested or do they just say that?"',
              '"Seems expensive compared to just buying a multivitamin"',
              '"How long before I actually notice anything?"',
            ],
            keyPhrases: [
              "simplify my routine",
              "actually feel a difference",
              "no more pill fatigue",
              "worth the price",
              "trusted by real people",
            ],
          }
        : undefined,
    };

    setResult(demoResult);
    setActiveSection(0);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Page Copy Audit</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Evaluate product page copy against the DTC conversion framework. Paste a Figma link to get started.
        </p>
      </div>

      {/* Input Section */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Figma Design URL</label>
            <input
              type="url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              className={inputClass}
              placeholder="https://www.figma.com/design/..."
            />
          </div>
          <div>
            <label className={labelClass}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className={inputClass}
              placeholder="e.g. AG1, Obvi, PetLab Co."
            />
          </div>
          <div>
            <label className={labelClass}>Product Type</label>
            <input
              type="text"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className={inputClass}
              placeholder="e.g. Greens powder, Collagen supplement"
            />
          </div>
          <div>
            <label className={labelClass}>Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className={inputClass}
            >
              <option value="">Select niche...</option>
              <option value="health">Health & Supplements</option>
              <option value="beauty">Beauty & Skincare</option>
              <option value="pet">Pet Care</option>
              <option value="food">Food & Beverage</option>
              <option value="fashion">Fashion & Apparel</option>
              <option value="home">Home & Lifestyle</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVoc}
                onChange={(e) => setIncludeVoc(e.target.checked)}
                className="rounded border-[#E5E5EA]"
              />
              <span className="text-sm text-[#7A7A7A]">Include VOC Research (Trustpilot + Reddit)</span>
            </label>
          </div>
        </div>
        <button
          onClick={handleAudit}
          disabled={!figmaUrl.trim() || loading}
          className="px-6 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30 transition-colors"
        >
          {loading ? "Analysing copy..." : "Run Audit"}
        </button>
      </div>

      {/* Figma Preview */}
      {embedUrl && (
        <div className="border border-[#E5E5EA] rounded-xl overflow-hidden mb-6 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#F0F0F0]">
            <p className="text-xs font-semibold text-[#1A1A1A]">Design Preview</p>
            <a href={figmaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#777] hover:text-[#1A1A1A]">
              Open in Figma
            </a>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "50%" }}>
            <iframe src={embedUrl} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white p-12 text-center">
          <div className="animate-spin size-8 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full mx-auto mb-4" />
          <p className="text-sm font-medium text-[#1A1A1A]">Analysing page copy...</p>
          <p className="text-xs text-[#AAA] mt-1">Reading design, evaluating against DTC framework, researching VOC data</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Score Overview */}
          <div className="space-y-4">
            {/* Overall Score Card */}
            <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Overall Score</p>
              <div className={`inline-flex items-center justify-center size-20 rounded-2xl text-3xl font-bold ${gradeColor(result.grade)}`}>
                {result.grade}
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A] mt-2">{result.overallScore.toFixed(1)}/10</p>
            </div>

            {/* Section Scores */}
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#F0F0F0]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Section Scores</p>
              </div>
              {result.sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#F5F5F5] last:border-0 ${
                    activeSection === i ? "bg-[#F7F8FA]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <span className={`text-xs font-bold min-w-[28px] ${scoreColor(s.score)}`}>{s.score}</span>
                  <span className="text-xs font-medium text-[#1A1A1A] flex-1">{s.name}</span>
                  <svg className={`size-3 text-[#CCC] transition-transform ${activeSection === i ? "rotate-90" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Top Priorities */}
            <div className="border border-[#E5E5EA] rounded-xl bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Top 3 Priority Changes</p>
              <div className="space-y-3">
                {result.topPriorities.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-[#555] leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Active Section Detail */}
          <div className="lg:col-span-2 space-y-4">
            {(() => {
              const s = result.sections[activeSection];
              return (
                <>
                  {/* Section Header */}
                  <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-[#1A1A1A]">{s.name}</h3>
                      <span className={`text-lg font-bold ${scoreColor(s.score)}`}>{s.score}/10</span>
                    </div>
                    {scoreBar(s.score)}
                  </div>

                  {/* What's Working */}
                  {s.working.length > 0 && (
                    <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">What&apos;s Working</p>
                      <div className="space-y-2">
                        {s.working.map((w, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <svg className="size-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-[#555]">{w}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues Found */}
                  {s.issues.length > 0 && (
                    <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-3">Issues Found</p>
                      <div className="space-y-2">
                        {s.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <svg className="size-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-[#555]">{issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Rewrites */}
                  {s.rewrites.length > 0 && (
                    <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Suggested Rewrites</p>
                      <div className="space-y-3">
                        {s.rewrites.map((rw, i) => (
                          <div key={i} className="rounded-lg border border-[#F0F0F0] overflow-hidden">
                            <div className="px-4 py-2.5 bg-red-50/50 border-b border-[#F0F0F0]">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Before</p>
                              <p className="text-sm text-[#555] line-through">{rw.before}</p>
                            </div>
                            <div className="px-4 py-2.5 bg-emerald-50/50">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">After</p>
                              <p className="text-sm text-[#1A1A1A] font-medium">{rw.after}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VOC Insight */}
                  {s.vocInsight && (
                    <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Voice of Customer Insight</p>
                      <p className="text-sm text-[#555]">{s.vocInsight}</p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* VOC Research Panel */}
            {result.vocData && (
              <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
                <div className="px-5 py-3 border-b border-[#F0F0F0] bg-[#FAFAFA]">
                  <p className="text-xs font-semibold text-[#1A1A1A]">Voice of Customer Research</p>
                  <p className="text-[10px] text-[#AAA] mt-0.5">Sourced from Trustpilot reviews and Reddit discussions</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F0F0F0]">
                  {/* Pain Points */}
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-2">Customer Pain Points</p>
                    <div className="space-y-2">
                      {result.vocData.painPoints.map((p, i) => (
                        <p key={i} className="text-xs text-[#555] italic">{p}</p>
                      ))}
                    </div>
                  </div>
                  {/* Objections */}
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">Common Objections</p>
                    <div className="space-y-2">
                      {result.vocData.objections.map((o, i) => (
                        <p key={i} className="text-xs text-[#555] italic">{o}</p>
                      ))}
                    </div>
                  </div>
                  {/* Key Phrases */}
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Key Phrases to Use</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.vocData.keyPhrases.map((kp, i) => (
                        <span key={i} className="inline-block px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full">
                          {kp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
