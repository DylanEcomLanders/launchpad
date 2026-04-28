import { DecorativeBlocks } from "@/components/decorative-blocks";
import { FontLibraryClient } from "./font-library-client";

export const metadata = {
  title: "Font Library — Team Tools",
};

export default function FontsPage() {
  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <FontLibraryClient />
      </div>
    </div>
  );
}
