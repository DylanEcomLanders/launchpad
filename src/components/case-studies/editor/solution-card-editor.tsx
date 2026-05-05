"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";
import type { SolutionCard } from "@/lib/case-studies/types";

interface Props {
  card: SolutionCard;
  index: number;
  onChange: (next: SolutionCard) => void;
  onDelete: () => void;
}

export function SolutionCardEditor({ card, index, onChange, onDelete }: Props) {
  return (
    <div className="bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
          {String(index + 1).padStart(2, "0")}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#A0A0A0] hover:text-red-600 transition-colors p-1"
          title="Remove card"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <div>
        <label className={labelClass}>Title</label>
        <input
          className={inputClass}
          value={card.title}
          onChange={(e) => onChange({ ...card, title: e.target.value })}
          placeholder="Strategic Roadmap"
        />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          rows={3}
          className={textareaClass}
          value={card.description}
          onChange={(e) => onChange({ ...card, description: e.target.value })}
          placeholder="What we did and why it mattered."
        />
      </div>
    </div>
  );
}
