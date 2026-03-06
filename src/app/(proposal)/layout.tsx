import { Logo } from "@/components/logo";

export const metadata = {
  title: "Your Proposal — Ecomlanders",
  description: "Review your custom Ecomlanders service proposal",
};

export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal branded header */}
      <header className="border-b border-[#F0F0F0] px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#0A0A0A]" />
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0] px-6 md:px-12 py-8 text-center">
        <p className="text-xs text-[#AAAAAA]">
          Ecomlanders &mdash; Shopify CRO &amp; Landing Page Agency
        </p>
      </footer>
    </div>
  );
}
