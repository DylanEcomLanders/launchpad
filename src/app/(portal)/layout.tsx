import { Logo } from "@/components/logo";

export const metadata = {
  title: "Client Portal — Ecomlanders",
  description: "View your project status, timeline, and documents",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
