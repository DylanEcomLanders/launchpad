import { FinanceGate } from "@/components/finance/finance-gate";
import { FinanceNav } from "@/components/finance/finance-nav";
import { FinanceConfigCheck } from "@/components/finance/finance-config-check";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinanceGate>
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-5 md:py-6">
        {/* Title + tabs share one row to reclaim vertical space.
         * "Founder access" eyebrow dropped since the passcode gate
         * already conveys that. */}
        <header className="flex items-center justify-between gap-4 mb-4 border-b border-[#EEEEF1]">
          <h1 className="text-xl font-semibold tracking-tight text-[#1B1B1B] pb-3 shrink-0">
            Finance
          </h1>
          <FinanceNav />
        </header>
        <FinanceConfigCheck />
        {children}
      </div>
    </FinanceGate>
  );
}
