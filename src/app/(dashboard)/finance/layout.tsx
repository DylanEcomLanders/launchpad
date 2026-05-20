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
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-14">
        <header className="mb-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#A0A0A0] font-semibold mb-1">
            Founder access
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1B1B1B]">
            Finance
          </h1>
        </header>
        <FinanceNav />
        <FinanceConfigCheck />
        {children}
      </div>
    </FinanceGate>
  );
}
