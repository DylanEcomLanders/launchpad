"use client";

import { useState } from "react";

export default function ResourcesPage() {
  const [copied, setCopied] = useState(false);
  const referralUrl = "https://ecomlanders.app/referral-programme";

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-sm text-subtle mt-1">Shareable assets for clients and prospects</p>
      </div>

      {/* Referral Programme */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-surface">Referral Programme</p>
              <p className="text-xs text-subtle mt-1 leading-relaxed max-w-md">
                Branded page explaining our referral offer. Share with existing clients to incentivise referrals. 7.5% commission (10% for 3+ referrals).
              </p>
            </div>
            <span className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider bg-success/10 text-success rounded-full">Live</span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-surface-raised rounded-lg text-xs font-mono text-subtle truncate">
              {referralUrl}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-surface-raised text-foreground text-xs font-medium rounded-lg hover:bg-surface-hover whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href="/referral-programme?edit=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-border text-xs font-medium rounded-lg hover:bg-surface-raised whitespace-nowrap"
            >
              Preview
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
