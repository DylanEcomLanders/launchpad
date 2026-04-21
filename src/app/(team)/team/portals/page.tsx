import { DecorativeBlocks } from "@/components/decorative-blocks";
import { TeamPortalsSection } from "../team-portals-section";

export default function TeamPortalsPage() {
  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            Client Portals
          </h1>
          <p className="text-sm text-[#7A7A7A]">
            Every active portal. Click through for the team view.
          </p>
        </div>
        <TeamPortalsSection hideHeader />
      </div>
    </div>
  );
}
