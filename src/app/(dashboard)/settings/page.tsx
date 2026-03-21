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
          <h1 className="text-2xl font-bold tracking-tight">Business Settings</h1>
          <p className="text-sm text-[#7A7A7A] mt-1">
            Configure turnaround times, working days, and phase durations. These are used by Project Kickoff and roadmap tools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium text-[#7A7A7A] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Deliverable Turnaround Times
        </h2>
        <p className="text-xs text-[#A0A0A0] mb-4">
          Business days per deliverable type. Used to auto-calculate project timelines.
        </p>

        <div className="border border-[#E5E5EA] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Type</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-center">Design Days</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-center">Dev Days</span>
            <span />
          </div>

          {/* Rows */}
          {settings.deliverableEstimates.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 border-b border-[#EDEDEF] last:border-0 items-center">
              <input
                type="text"
                value={d.name}
                onChange={(e) => updateEstimate(i, "name", e.target.value)}
                className="text-sm px-2 py-1 border border-[#E5E5EA] rounded"
              />
              <input
                type="number"
                min={0}
                value={d.designDays}
                onChange={(e) => updateEstimate(i, "designDays", e.target.value)}
                className="text-sm px-2 py-1 border border-[#E5E5EA] rounded text-center"
              />
              <input
                type="number"
                min={0}
                value={d.devDays}
                onChange={(e) => updateEstimate(i, "devDays", e.target.value)}
                className="text-sm px-2 py-1 border border-[#E5E5EA] rounded text-center"
              />
              <button
                onClick={() => removeEstimate(i)}
                className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}

          {/* Add new */}
          <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-4 py-2 bg-[#FAFAFA] items-center">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New deliverable type..."
              className="text-sm px-2 py-1 border border-[#E5E5EA] rounded placeholder:text-[#CCC]"
              onKeyDown={(e) => { if (e.key === "Enter") addEstimate(); }}
            />
            <span />
            <span />
            <button
              onClick={addEstimate}
              disabled={!newName.trim()}
              className="p-1 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors disabled:opacity-30"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Phase Durations */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Phase Durations
        </h2>
        <div className="border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Revision Phase</p>
              <p className="text-xs text-[#A0A0A0]">Business days for client feedback and design revisions</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.revisionDays}
                onChange={(e) => setSettings({ ...settings, revisionDays: Math.max(1, Number(e.target.value)) })}
                className="w-16 text-sm px-2 py-1 border border-[#E5E5EA] rounded text-center"
              />
              <span className="text-xs text-[#AAA]">days</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Post-Launch Support</p>
              <p className="text-xs text-[#A0A0A0]">Calendar days of support after launch</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={settings.supportDays}
                onChange={(e) => setSettings({ ...settings, supportDays: Math.max(1, Number(e.target.value)) })}
                className="w-16 text-sm px-2 py-1 border border-[#E5E5EA] rounded text-center"
              />
              <span className="text-xs text-[#AAA]">days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Working Days */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Working Days
        </h2>
        <p className="text-xs text-[#A0A0A0] mb-4">
          Deadlines and turnaround times only count these days. Non-working days are skipped.
        </p>
        <div className="flex gap-2">
          {dayLabels.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleDay(key)}
              className={`flex-1 py-3 text-sm font-medium rounded-lg border transition-colors ${
                settings.workingDays[key]
                  ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                  : "bg-white text-[#AAA] border-[#E5E5EA] hover:border-[#999]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Team Directory */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Team Directory
        </h2>
        <p className="text-xs text-[#A0A0A0] mb-4">
          Team members with their Slack and ClickUp IDs. Used for ticket assignment and portal team display.
        </p>

        {(settings.team || []).length > 0 && (
          <div className="border border-[#E5E5EA] rounded-lg overflow-hidden mb-4">
            <div className="grid grid-cols-[1fr_120px_120px_120px_40px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Name / Role</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Email</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Slack ID</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">ClickUp ID</span>
              <span />
            </div>
            {(settings.team || []).map((member, i) => {
              const updateMember = (field: keyof typeof member, value: string) => {
                const updated = (settings.team || []).map((m, idx) => idx === i ? { ...m, [field]: value } : m);
                setSettings({ ...settings, team: updated });
              };
              return (
                <div key={member.id} className="grid grid-cols-[1fr_120px_120px_120px_40px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center">
                  <div className="space-y-0.5">
                    <input type="text" value={member.name} onChange={(e) => updateMember("name", e.target.value)} className="text-sm font-medium text-[#1A1A1A] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none w-full px-0 py-0" />
                    <input type="text" value={member.role} onChange={(e) => updateMember("role", e.target.value)} className="text-[10px] text-[#AAA] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none w-full px-0 py-0" placeholder="Role" />
                  </div>
                  <input type="text" value={member.email} onChange={(e) => updateMember("email", e.target.value)} className="text-xs text-[#777] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none w-full px-0 py-0 truncate" placeholder="email" />
                  <input type="text" value={member.slack_id} onChange={(e) => updateMember("slack_id", e.target.value)} className="text-xs text-[#777] font-mono bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none w-full px-0 py-0 truncate" placeholder="Slack ID" />
                  <input type="text" value={member.clickup_id} onChange={(e) => updateMember("clickup_id", e.target.value)} className="text-xs text-[#777] font-mono bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none w-full px-0 py-0 truncate" placeholder="ClickUp ID" />
                  <button
                    onClick={() => setSettings({ ...settings, team: (settings.team || []).filter((_, idx) => idx !== i) })}
                    className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showAddMember ? (
          <div className="border border-[#E5E5EA] rounded-lg p-4 bg-[#FAFAFA] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Name *</label>
                <input type="text" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded" placeholder="e.g. Dylan Evans" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Role *</label>
                <input type="text" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded" placeholder="e.g. Developer" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Email</label>
                <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded" placeholder="dylan@ecomlanders.com" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Slack ID</label>
                <input type="text" value={newMember.slack_id} onChange={(e) => setNewMember({ ...newMember, slack_id: e.target.value })} className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded font-mono" placeholder="U0XXXXXXX" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">ClickUp ID</label>
                <input type="text" value={newMember.clickup_id} onChange={(e) => setNewMember({ ...newMember, clickup_id: e.target.value })} className="w-full text-sm px-2 py-1.5 border border-[#E5E5EA] rounded font-mono" placeholder="User ID from ClickUp" />
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
                className="px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg disabled:opacity-30"
              >
                Add Member
              </button>
              <button onClick={() => setShowAddMember(false)} className="px-3 py-1.5 text-xs text-[#7A7A7A]">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1.5 text-xs text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add team member
          </button>
        )}
      </section>
    </div>
  );
}
