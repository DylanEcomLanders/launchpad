"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { createIssue } from "@/lib/issues/data";
import type { IssueType } from "@/lib/issues/types";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";

export function ReportIssueButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IssueType>("bug");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    createIssue({
      title: title.trim(),
      description: description.trim(),
      type,
      page: pathname,
      reported_by: "",
    });

    setTitle("");
    setDescription("");
    setType("bug");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
    }, 1500);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 bg-[#0A0A0A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#333] transition-colors"
        title="Report an issue"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-t-xl sm:rounded-xl w-full max-w-md mx-4 mb-0 sm:mb-0 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-semibold">Report an Issue</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#AAAAAA] hover:text-[#0A0A0A] text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#6B6B6B]">Logged. Thanks!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IssueType)}
                    className={selectClass}
                  >
                    <option value="bug">Bug</option>
                    <option value="change-request">Change Request</option>
                    <option value="idea">Idea</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's the issue?"
                    className={inputClass}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Details (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Any extra context..."
                    rows={3}
                    className={inputClass}
                  />
                </div>

                <p className="text-[10px] text-[#AAAAAA]">
                  Page: {pathname}
                </p>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0A0A0A] text-white text-sm rounded-md hover:bg-[#333] transition-colors"
                >
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
