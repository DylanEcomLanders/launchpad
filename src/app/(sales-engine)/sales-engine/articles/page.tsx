"use client";

import { useState, useEffect, useCallback } from "react";
import { createStore } from "@/lib/supabase-store";
import { inputClass, labelClass } from "@/lib/form-styles";

interface Article {
  id: string;
  topic: string;
  angle: string;
  content: string;
  status: "draft" | "approved" | "posted" | "rejected";
  author: "dylan" | "ajay";
  created_at: string;
  word_count: number;
}

const store = createStore<Article>({ table: "articles", lsKey: "launchpad-articles" });

const TOPIC_SUGGESTIONS = [
  "How to actually fix your PDP and convert traffic",
  "Why most Shopify stores waste 70% of their ad spend on the landing page",
  "The advertorial playbook — how to warm cold traffic before your PDP",
  "5 A/B tests every DTC brand should run this month",
  "Why your homepage isn't a sales page (and what to do about it)",
  "The subscription framing trick that adds 30% to AOV",
  "How to audit any Shopify store in 15 minutes",
  "Gallery-as-a-sales-deck: the PDP image strategy no one talks about",
  "Why we stopped building pretty pages and started building conversion machines",
  "The CRO testing framework we use for 7-8 figure brands",
  "What I learned building 200+ landing pages for DTC brands",
  "How to structure a listicle that actually converts cold traffic",
  "The funnel most DTC brands are missing between ads and PDP",
  "Social proof mechanics — why 4.8 stars converts better than 5.0",
  "Mobile PDP optimisation — where 80% of your revenue is leaking",
];

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [author, setAuthor] = useState<"dylan" | "ajay">("dylan");
  const [filter, setFilter] = useState<"all" | "draft" | "approved" | "posted" | "rejected">("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await store.getAll();
    setArticles(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), angle: angle.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      const article: Article = {
        id: crypto.randomUUID(),
        topic: topic.trim(),
        angle: angle.trim(),
        content: data.article,
        status: "draft",
        author,
        created_at: new Date().toISOString(),
        word_count: data.article.split(/\s+/).length,
      };

      await store.create(article);
      setTopic("");
      setAngle("");
      setShowGenerator(false);
      setSelectedArticle(article);
      load();
    } catch (err: any) {
      alert(err?.message || "Failed to generate");
    }
    setGenerating(false);
  };

  const updateStatus = async (id: string, status: Article["status"]) => {
    await store.update(id, { status } as Partial<Article>);
    if (selectedArticle?.id === id) setSelectedArticle({ ...selectedArticle, status });
    load();
  };

  const saveEdit = async () => {
    if (!selectedArticle) return;
    await store.update(selectedArticle.id, {
      content: editContent,
      word_count: editContent.split(/\s+/).length,
    } as Partial<Article>);
    setSelectedArticle({ ...selectedArticle, content: editContent, word_count: editContent.split(/\s+/).length });
    setEditing(false);
    load();
  };

  const deleteArticle = async (id: string) => {
    await store.remove(id);
    if (selectedArticle?.id === id) setSelectedArticle(null);
    load();
  };

  const filtered = filter === "all" ? articles : articles.filter((a) => a.status === filter);

  const statusColor: Record<string, string> = {
    draft: "bg-[#F3F3F5] text-[#777]",
    approved: "bg-emerald-50 text-emerald-600",
    posted: "bg-blue-50 text-blue-600",
    rejected: "bg-red-50 text-red-500",
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full">
      {/* Left — Library */}
      <div className={`${selectedArticle ? "w-96 border-r border-[#E5E5EA]" : "flex-1 max-w-3xl mx-auto"} overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Article Library</h1>
              <p className="text-xs text-[#AAA] mt-1">{articles.length} articles · {articles.filter(a => a.status === "approved").length} ready to post</p>
            </div>
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
            >
              + Generate
            </button>
          </div>

          {/* Generator */}
          {showGenerator && (
            <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6 space-y-4">
              <div>
                <label className={labelClass}>Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={inputClass}
                  placeholder="What should the article be about?"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {TOPIC_SUGGESTIONS.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTopic(s)}
                    className="px-2 py-1 text-[10px] text-[#777] bg-[#F5F5F5] rounded-full hover:bg-[#E8E8E8] truncate max-w-[200px]"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label className={labelClass}>Angle (optional)</label>
                <input
                  type="text"
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. focus on mobile, target supplement brands, compare to competitors..."
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {(["dylan", "ajay"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAuthor(a)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        author === a ? "bg-[#1A1A1A] text-white" : "text-[#999] hover:bg-[#F5F5F5]"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || generating}
                  className="ml-auto px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
                >
                  {generating ? "Generating..." : "Generate Article"}
                </button>
              </div>

              {generating && (
                <div className="flex items-center gap-3 py-4 justify-center">
                  <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
                  <p className="text-xs text-[#777]">Writing article in your voice...</p>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-1.5 mb-4">
            {(["all", "draft", "approved", "posted", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                  filter === f ? "bg-[#1A1A1A] text-white" : "text-[#999] hover:bg-[#F5F5F5]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && ` (${articles.filter(a => a.status === f).length})`}
              </button>
            ))}
          </div>

          {/* Article list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
              <p className="text-sm text-[#AAA]">No articles yet</p>
              <p className="text-xs text-[#CCC] mt-1">Generate your first article above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((article) => (
                <button
                  key={article.id}
                  onClick={() => { setSelectedArticle(article); setEditing(false); }}
                  className={`w-full text-left border rounded-lg p-4 transition-colors ${
                    selectedArticle?.id === article.id
                      ? "border-[#1A1A1A] bg-[#FAFAFA]"
                      : "border-[#E5E5EA] hover:border-[#999]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A1A] truncate">{article.topic}</p>
                      <p className="text-[10px] text-[#AAA] mt-1">
                        {article.word_count.toLocaleString()} words · {article.author} · {new Date(article.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full ${statusColor[article.status]}`}>
                      {article.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#777] mt-2 line-clamp-2">{article.content.slice(0, 150)}...</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Article preview/editor */}
      {selectedArticle && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-lg font-bold text-[#1A1A1A]">{selectedArticle.topic}</p>
                <p className="text-xs text-[#AAA] mt-1">
                  {selectedArticle.word_count.toLocaleString()} words · {selectedArticle.author} · {new Date(selectedArticle.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-xs text-[#CCC] hover:text-[#1A1A1A]">Close</button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mb-6 pb-6 border-b border-[#F0F0F0]">
              <button
                onClick={() => updateStatus(selectedArticle.id, "approved")}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  selectedArticle.status === "approved" ? "bg-emerald-500 text-white" : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(selectedArticle.id, "posted")}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  selectedArticle.status === "posted" ? "bg-blue-500 text-white" : "border border-blue-200 text-blue-600 hover:bg-blue-50"
                }`}
              >
                Mark Posted
              </button>
              <button
                onClick={() => updateStatus(selectedArticle.id, "rejected")}
                className="px-3 py-1.5 text-[11px] font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
              >
                Reject
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(selectedArticle.content)}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]"
                >
                  Copy
                </button>
                <button
                  onClick={() => { setEditing(!editing); setEditContent(selectedArticle.content); }}
                  className="px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
                <button
                  onClick={() => { if (confirm("Delete this article?")) deleteArticle(selectedArticle.id); }}
                  className="px-3 py-1.5 text-[11px] font-medium text-red-400 border border-red-100 rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Content */}
            {editing ? (
              <div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[600px] text-sm leading-relaxed px-0 py-0 border-0 focus:outline-none resize-none font-mono"
                />
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={saveEdit} className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg">Save Changes</button>
                  <span className="text-[10px] text-[#AAA]">{editContent.split(/\s+/).length.toLocaleString()} words</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
