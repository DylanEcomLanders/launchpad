"use client";

export default function SalesEngineHome() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">Command Centre</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">Overview of your pipeline, content, and growth activity</p>
      </div>

      {/* Placeholder metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Pipeline Value", value: "\u00A30", sub: "0 active deals" },
          { label: "Content This Week", value: "0", sub: "0 published" },
          { label: "Follow-ups Due", value: "0", sub: "None overdue" },
          { label: "Leads This Month", value: "0", sub: "0 qualified" },
        ].map((m) => (
          <div key={m.label} className="border border-[#E5E5EA] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">{m.label}</p>
            <p className="text-xl font-bold text-[#1A1A1A]">{m.value}</p>
            <p className="text-[11px] text-[#999] mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Recent Deals</h2>
          <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
            <p className="text-sm text-[#AAA]">No deals yet</p>
            <p className="text-xs text-[#CCC] mt-1">Create your first deal in Pipeline</p>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Upcoming Follow-ups</h2>
          <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
            <p className="text-sm text-[#AAA]">No follow-ups scheduled</p>
            <p className="text-xs text-[#CCC] mt-1">Follow-ups from deals will appear here</p>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Content Schedule</h2>
          <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
            <p className="text-sm text-[#AAA]">No content planned</p>
            <p className="text-xs text-[#CCC] mt-1">Plan your week in the Content Calendar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
