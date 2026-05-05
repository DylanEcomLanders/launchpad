"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ImageUpload } from "./image-upload";
import type { CaseStudyImage } from "@/lib/case-studies/types";

interface Props {
  label: string;          // e.g. "Desktop slices"
  helper?: string;
  slices: CaseStudyImage[];
  slug: string;
  onChange: (next: CaseStudyImage[]) => void;
}

/* Stack of full-page screenshot uploaders. Each slice is one image (typically
 * a tall full-page screenshot). Multiple slices stack vertically in the public
 * modal viewer. */
export function PageSlicesEditor({ label, helper, slices, slug, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
        {label}
      </label>
      {helper && <p className="text-[10px] text-[#A0A0A0] mb-3">{helper}</p>}
      <div className="space-y-3">
        {slices.map((slice, i) => (
          <div
            key={slice.filename || i}
            className="bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg p-3 flex items-start gap-3"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] w-8 pt-1">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0">
              <ImageUpload
                slug={slug}
                aspect="auto"
                value={slice}
                onChange={(next) => {
                  onChange(
                    next
                      ? slices.map((s, idx) => (idx === i ? next : s))
                      : slices.filter((_, idx) => idx !== i),
                  );
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(slices.filter((_, idx) => idx !== i))}
              className="text-[#A0A0A0] hover:text-red-600 p-1"
              title="Remove slice"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        ))}
        <ImageUpload
          slug={slug}
          aspect="auto"
          value={undefined}
          helper="Drop a full-page screenshot"
          onChange={(img) => {
            if (!img) return;
            onChange([...slices, img]);
          }}
        />
      </div>
    </div>
  );
}
