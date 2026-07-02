"use client";

import { useState, useEffect } from "react";
import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { getSettings, saveSettings, loadSettings, DEFAULT_SETTINGS, type BusinessSettings, type DeliverableEstimate, type TeamMember } from "@/lib/settings";
import { inputClass, labelClass } from "@/lib/form-styles";

const dayLabels = [
  { key: "mon" as const, label: "Mon" },
  { key: "tue" as const, label: "Tue" },
  { key: "wed" as const, label: "Wed" },
  { key: "thu" as const, label: "Thu" },
  { key: "fri" as const, label: "Fri" },
  { key: "sat" as const, label: "Sat" },
  { key: "sun" as const, label: "Sun" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState<Omit<TeamMember, "id">>({ name: "", role: "", email: "", slack_id: "", clickup_id: "" });

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateEstimate = (index: number, field: keyof DeliverableEstimate, value: string | number) => {
    const updated = settings.deliverableEstimates.map((d, i) =>
      i === index ? { ...d, [field]: field === "name" ? value : Math.max(0, Number(value)) } : d
    );
    setSettings({ ...settings, deliverableEstimates: updated });
  };

  const removeEstimate = (index: number) => {
    setSettings({
      ...settings,
      deliverableEstimates: settings.deliverableEstimates.filter((_, i) => i !== index),
    });
  };

  const addEstimate = () => {
    if (!newName.trim()) return;
    setSettings({
      ...settings,
      deliverableEstimates: [...settings.deliverableEstimates, { name: newName.trim(), designDays: 2, devDays: 2 }],
    });
    setNewName("");
  };

  const toggleDay = (day: keyof BusinessSettings["workingDays"]) => {
    setSettings({
      ...settings,
      workingDays: { ...settings.workingDays, [day]: !settings.workingDays[day] },
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] leading-tight font-bold text-foreground">Business Settings</h1>
          <p className="text-sm text-subtle mt-1">
            Configure turnaround times, working days, and phase durations. These are used by Project Kickoff and roadmap tools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium text-subtle border border-border rounded-lg hover:bg-surface-raised transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            {saved ? (
              <>
                <CheckIcon className="size-3.5" />
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>

      {/* Deliverable Turnaround Times */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Deliverable Turnaround Times
        </h2>
        <p className="text-xs text-subtle mb-4">
          Business days per deliverable type. Used to auto-calculate project timelines.
        </p>

        <div className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 bg-background border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Type</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted text-center">Design Days</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted text-center">Dev Days</span>
            <span />
          </div>

          {/* Rows */}
          {settings.deliverableEstimates.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 border-b border-border last:border-0 items-center">
              <input
                type="text"
                value={d.name}
                onChange={(e) => updateEstimate(i, "name", e.target.value)}
                className="text-sm px-2 py-1 border border-border rounded"
              />
              <input
                type="number"
                min={0}
                value={d.designDays}
                onChange={(e) => updateEstimate(i, "designDays", e.target.value)}
                className="text-sm px-2 py-1 border border-border rounded text-center"
              />
              <input
                type="number"
                min={0}
                value={d.devDays}
                onChange={(e) => updateEstimate(i, "devDays", e.target.value)}
                className="text-sm px-2 py-1 border border-border rounded text-center"
              />
              <button
                onClick={() => removeEstimate(i)}
                className="p-1 text-subtle hover:text-danger transition-colors"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}

          {/* Add new */}
          <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 bg-background items-center">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New deliverable type..."
              className="text-sm px-2 py-1 border border-border rounded placeholder:text-muted"
              onKeyDown={(e) => { if (e.key === "Enter") addEstimate(); }}
            />
            <span />
            <span />
            <button
              onClick={addEstimate}
              disabled={!newName.trim()}
              className="p-1 text-subtle hover:text-foreground transition-colors disabled:opacity-30"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Phase Durations */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Phase Durations
        </h2>
        <div className="border border-border rounded-lg divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Revision Phase</p>
              <p className="text-xs text-subtle">Business days for client feedback and design revisions</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.revisionDays}
                onChange={(e) => setSettings({ ...settings, revisionDays: Math.max(1, Number(e.target.value)) })}
                className="w-16 text-sm px-2 py-1 border border-border rounded text-center"
              />
              <span className="text-xs text-muted">days</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Post-Launch Support</p>
              <p className="text-xs text-subtle">Calendar days of support after launch</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.supportDays}
                onChange={(e) => setSettings({ ...settings, supportDays: Math.max(1, Number(e.target.value)) })}
                className="w-16 text-sm px-2 py-1 border border-border rounded text-center"
              />
              <span className="text-xs text-muted">days</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Deadline Buffer</p>
              <p className="text-xs text-subtle">Extra business days added to client-facing deadlines — under-promise, over-deliver</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={settings.deadlineBufferDays ?? 3}
                onChange={(e) => setSettings({ ...settings, deadlineBufferDays: Math.max(0, Number(e.target.value)) })}
                className="w-16 text-sm px-2 py-1 border border-border rounded text-center"
              />
              <span className="text-xs text-muted">days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Working Days */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Working Days
        </h2>
        <p className="text-xs text-subtle mb-4">
          Deadlines and turnaround times only count these days. Non-working days are skipped.
        </p>
        <div className="flex gap-2">
          {dayLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleDay(key)}
              className={`flex-1 py-3 text-sm font-medium rounded-lg border transition-colors ${
                settings.workingDays[key]
                  ? "bg-foreground text-surface border-foreground"
                  : "bg-surface text-muted border-border hover:border-subtle"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Touchpoint Days */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Touchpoint Days
        </h2>
        <p className="text-xs text-subtle mb-4">
          Days when client touchpoints are scheduled. The system auto-calculates the next touchpoint for each client.
        </p>
        <div className="flex gap-2">
          {dayLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                const tp = settings.touchpointDays || { mon: true, tue: false, wed: true, thu: false, fri: true, sat: false, sun: false };
                setSettings({ ...settings, touchpointDays: { ...tp, [key]: !tp[key] } });
              }}
              className={`flex-1 py-3 text-sm font-medium rounded-lg border transition-colors ${
                (settings.touchpointDays || { mon: true, tue: false, wed: true, thu: false, fri: true, sat: false, sun: false })[key]
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-surface text-muted border-border hover:border-subtle"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Team Directory */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Team Directory
        </h2>
        <p className="text-xs text-subtle mb-4">
          Team members with their Slack and ClickUp IDs. Used for ticket assignment and portal team display.
        </p>

        {(settings.team || []).length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden mb-4">
            <div className="grid grid-cols-[1fr_120px_120px_120px_40px] gap-2 px-4 py-2 bg-background border-b border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Name / Role</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Email</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Slack ID</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">ClickUp ID</span>
              <span />
            </div>
            {(settings.team || []).map((member, i) => {
              const updateMember = (field: keyof typeof member, value: string) => {
                const updated = (settings.team || []).map((m, idx) => idx === i ? { ...m, [field]: value } : m);
                setSettings({ ...settings, team: updated });
              };
              return (
                <div key={member.id} className="grid grid-cols-[1fr_120px_120px_120px_40px] gap-2 px-4 py-2.5 border-b border-border last:border-0 items-center">
                  <div className="space-y-0.5">
                    <input type="text" value={member.name} onChange={(e) => updateMember("name", e.target.value)} className="text-sm font-medium text-foreground bg-transparent border-0 border-b border-transparent hover:border-border focus:border-subtle focus:outline-none w-full px-0 py-0" />
                    <input type="text" value={member.role} onChange={(e) => updateMember("role", e.target.value)} className="text-[10px] text-muted bg-transparent border-0 border-b border-transparent hover:border-border focus:border-subtle focus:outline-none w-full px-0 py-0" placeholder="Role" />
                  </div>
                  <input type="text" value={member.email} onChange={(e) => updateMember("email", e.target.value)} className="text-xs text-muted bg-transparent border-0 border-b border-transparent hover:border-border focus:border-subtle focus:outline-none w-full px-0 py-0 truncate" placeholder="email" />
                  <input type="text" value={member.slack_id} onChange={(e) => updateMember("slack_id", e.target.value)} className="text-xs text-muted font-mono bg-transparent border-0 border-b border-transparent hover:border-border focus:border-subtle focus:outline-none w-full px-0 py-0 truncate" placeholder="Slack ID" />
                  <input type="text" value={member.clickup_id} onChange={(e) => updateMember("clickup_id", e.target.value)} className="text-xs text-muted font-mono bg-transparent border-0 border-b border-transparent hover:border-border focus:border-subtle focus:outline-none w-full px-0 py-0 truncate" placeholder="ClickUp ID" />
                  <button
                    onClick={() => setSettings({ ...settings, team: (settings.team || []).filter((_, idx) => idx !== i) })}
                    className="p-1 text-subtle hover:text-danger transition-colors"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showAddMember ? (
          <div className="border border-border rounded-lg p-4 bg-background space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1">Name *</label>
                <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className={inputClass} placeholder="e.g. Dylan Evans" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1">Role *</label>
                <input type="text" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className={inputClass} placeholder="e.g. Developer" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1">Email</label>
                <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className={inputClass} placeholder="dylan@ecomlanders.com" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1">Slack ID</label>
                <input type="text" value={newMember.slack_id} onChange={(e) => setNewMember({ ...newMember, slack_id: e.target.value })} className={`${inputClass} font-mono`} placeholder="U0XXXXXXX" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted block mb-1">ClickUp ID</label>
                <input type="text" value={newMember.clickup_id} onChange={(e) => setNewMember({ ...newMember, clickup_id: e.target.value })} className={`${inputClass} font-mono`} placeholder="User ID from ClickUp" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!newMember.name.trim() || !newMember.role.trim()) return;
                  const member: TeamMember = { ...newMember, id: crypto.randomUUID() };
                  setSettings({ ...settings, team: [...(settings.team || []), member] });
                  setNewMember({ name: "", role: "", email: "", slack_id: "", clickup_id: "" });
                  setShowAddMember(false);
                }}
                disabled={!newMember.name.trim() || !newMember.role.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-foreground text-surface rounded-lg disabled:opacity-30"
              >
                Add Member
              </button>
              <button onClick={() => setShowAddMember(false)} className="px-3 py-1.5 text-xs text-subtle">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 text-xs text-subtle hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add team member
          </button>
        )}
      </section>

      {/* Team NDAs */}
      {(settings.team || []).length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
            Team NDAs
          </h2>
          <p className="text-xs text-subtle mb-4">
            Track NDA status for each team member. Upload signed documents or mark as signed.
          </p>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_120px_120px] gap-2 px-4 py-2 bg-background border-b border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Team Member</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Link</span>
            </div>
            {(settings.team || []).map((member, i) => {
              const updateNda = (field: string, value: unknown) => {
                const updated = (settings.team || []).map((m, idx) => idx === i ? { ...m, [field]: value } : m);
                setSettings({ ...settings, team: updated });
              };
              return (
                <div key={member.id} className="grid grid-cols-[1fr_100px_120px_120px] gap-2 px-4 py-3 border-b border-border last:border-0 items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-[10px] text-muted">{member.role}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold w-fit ${
                    member.nda_signed
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}>
                    <span className={`size-1.5 rounded-full ${member.nda_signed ? "bg-success" : "bg-danger"}`} />
                    {member.nda_signed ? "Signed" : "Pending"}
                  </span>
                  <div>
                    {member.nda_signed && member.nda_signed_date ? (
                      <span className="text-xs text-muted">{member.nda_signed_date}</span>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/nda/${member.id}`);
                      }}
                      className="text-[10px] font-medium text-muted hover:text-foreground transition-colors"
                    >
                      Copy Link
                    </button>
                    <a
                      href={`/nda/${member.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium text-muted hover:text-foreground transition-colors"
                    >
                      View
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Compensation & Margins */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Compensation & Margins
        </h2>
        <p className="text-xs text-subtle mb-4">
          Rate card for retainers and page builds. Reference for the team.
        </p>

        {/* Retainer Rates */}
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2.5 bg-background border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">CRO Retainer Rates</p>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              <span>Role</span><span>Foundation (T1)</span><span>Growth (T2)</span><span>Scale (T3)</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">CRO Strategist</span>
              <span className="text-xs text-muted">20% of fee</span>
              <span className="text-xs text-muted">20% of fee</span>
              <span className="text-xs text-muted">20% of fee</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">Designer</span>
              <span className="text-xs text-muted">£200/mo</span>
              <span className="text-xs text-muted">£300/mo</span>
              <span className="text-xs text-muted">£400/mo</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">Developer</span>
              <span className="text-xs text-muted">£14/hr</span>
              <span className="text-xs text-muted">£14/hr</span>
              <span className="text-xs text-muted">£14/hr</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-3 items-center text-[10px] text-muted">
              <span>Est. dev hrs/test</span>
              <span>~2hrs</span>
              <span>~2hrs</span>
              <span>~2hrs</span>
            </div>
          </div>
        </div>

        {/* Page Build Rates */}
        <div className="border border-border rounded-lg overflow-hidden mb-4">
          <div className="px-4 py-2.5 bg-background border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Page Build Rates</p>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              <span>Role</span><span>Per Page</span><span>Notes</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">CRO / Copy</span>
              <span className="text-xs text-muted">£150</span>
              <span className="text-[10px] text-muted">→ £200 after 60 days</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">Designer</span>
              <span className="text-xs text-muted">£250</span>
              <span className="text-[10px] text-muted">Per page</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 items-center">
              <span className="text-xs font-medium text-foreground">Developer</span>
              <span className="text-xs text-muted">£300</span>
              <span className="text-[10px] text-muted">Per page</span>
            </div>
          </div>
        </div>

        {/* CRO Deliverables */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-background border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">CRO Deliverables — Page Builds</p>
          </div>
          <div className="divide-y divide-border">
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-foreground">1. Pre-Design</p>
              <p className="text-[10px] text-muted mt-0.5">Initial audit notes, highest leverage plays, angle identification, funnel positioning</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-foreground">2. Design Review</p>
              <p className="text-[10px] text-muted mt-0.5">Collaborate with designer on copy, angle, structure. Ensure the page converts.</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-foreground">3. Funnel Strategy</p>
              <p className="text-[10px] text-muted mt-0.5">Where does this page sit? Next highest leverage page? Traffic warmth recommendations.</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-foreground">4. Post-Launch</p>
              <p className="text-[10px] text-muted mt-0.5">Performance breakdown, what&apos;s working, what to iterate on.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Slack Notifications */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Slack Notifications
        </h2>
        <p className="text-xs text-subtle mb-4">
          Control which automated Slack notifications are active. All notifications are sent via the Ecomlanders bot.
        </p>

        <div className="border border-border rounded-lg divide-y divide-border">
          {([
            { key: "payment_received" as const, label: "Payment Received", desc: "Post to #ops when a Whop payment comes in with draft portal" },
            { key: "qa_gate_submitted" as const, label: "QA Gate Submitted", desc: "Post to internal channel when a CRO brief, design handoff, or dev checklist is submitted" },
            { key: "deadline_warnings" as const, label: "Deadline Warnings", desc: "Daily check — posts to internal channel when a phase is due in 2 days or overdue" },
            { key: "monday_breakdown" as const, label: "Monday Breakdown", desc: "Weekly #ops digest — deadlines, blockers, retainer status, and action items" },
            { key: "friday_digest" as const, label: "Friday Digest", desc: "End-of-week #ops summary — completed work, blockers, overdue, and retainer reports" },
          ]).map(({ key, label, desc }) => {
            const notifications = settings.notifications || { payment_received: true, qa_gate_submitted: true, deadline_warnings: true, monday_breakdown: true, friday_digest: true };
            const enabled = notifications[key] ?? true;
            return (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-subtle">{desc}</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, notifications: { ...notifications, [key]: !enabled } })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-success" : "bg-surface-raised"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Audit Knowledge Base */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-4">
          Audit Knowledge Base
        </h2>
        <p className="text-xs text-subtle mb-4">
          CRO audit framework fed into every audit generation. Update this to make the audit engine smarter over time. Supports markdown.
        </p>
        <textarea
          value={settings.audit_knowledge_base || ""}
          onChange={(e) => setSettings({ ...settings, audit_knowledge_base: e.target.value })}
          className="w-full min-h-[300px] text-xs font-mono px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:border-subtle placeholder:text-muted leading-relaxed"
          placeholder="Enter your CRO audit framework, scoring criteria, severity guides, and writing style rules..."
        />
        <p className="text-[10px] text-muted mt-2">
          {(settings.audit_knowledge_base || "").length > 0
            ? `${(settings.audit_knowledge_base || "").length.toLocaleString()} characters`
            : "Empty — default framework will be used"}
        </p>
      </section>
    </div>
  );
}
