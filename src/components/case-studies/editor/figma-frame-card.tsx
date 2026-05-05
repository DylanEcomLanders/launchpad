"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import type { FigmaFrame, DeviceFrame } from "@/lib/case-studies/types";

interface Props {
  frame: FigmaFrame;
  index: number;
  onChange: (next: FigmaFrame) => void;
  onDelete: () => void;
}

const DEVICES: { value: DeviceFrame; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

export function FigmaFrameCard({ frame, index, onChange, onDelete }: Props) {
  return (
    <div className="bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
          Frame {index + 1}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#A0A0A0] hover:text-red-600 transition-colors p-1"
          title="Remove frame"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <div>
        <label className={labelClass}>Figma share URL</label>
        <input
          className={inputClass}
          value={frame.shareUrl}
          onChange={(e) => onChange({ ...frame, shareUrl: e.target.value })}
          placeholder="https://www.figma.com/design/..."
        />
        <p className="text-[10px] text-[#A0A0A0] mt-1">
          Right-click frame in Figma → Copy link to selection
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Device frame</label>
          <select
            className={selectClass}
            value={frame.device || "desktop"}
            onChange={(e) => onChange({ ...frame, device: e.target.value as DeviceFrame })}
          >
            {DEVICES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Caption (optional)</label>
          <input
            className={inputClass}
            value={frame.caption || ""}
            onChange={(e) => onChange({ ...frame, caption: e.target.value })}
            placeholder="What this frame shows"
          />
        </div>
      </div>
    </div>
  );
}
