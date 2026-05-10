import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import OffersClient from "./offers-client";

export const revalidate = 300;

const BUCKET = "audit-portfolio";

async function getPortfolioImages(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 12, sortBy: { column: "created_at", order: "asc" } });
    if (!files || files.length === 0) return [];
    const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp|avif)$/i.test(f.name));
    return imageFiles.map((f) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.name, {
        transform: { width: 480, height: 720, resize: "cover", quality: 75 },
      });
      return data.publicUrl;
    });
  } catch {
    return [];
  }
}

export const metadata = {
  title: "Offers — Ecom Landers",
  description:
    "What we actually do — the Conversion Engine partnership and one-off funnel builds for Shopify brands.",
};

export default async function OffersPage() {
  const images = await getPortfolioImages();
  return <OffersClient portfolioImages={images} />;
}
