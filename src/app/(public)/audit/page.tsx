import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import AuditLandingPage from "./audit-client";

export const revalidate = 300; // 5 min ISR

const BUCKET = "audit-portfolio";
const ORDER_TABLE = "kv_store";
const ORDER_KEY = "audit-portfolio-order";

async function getPortfolioImages(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let order: string[] | null = null;
    try {
      const { data } = await supabase
        .from(ORDER_TABLE)
        .select("data")
        .eq("id", ORDER_KEY)
        .single();
      if (data?.data) order = data.data as string[];
    } catch {}

    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 200, sortBy: { column: "created_at", order: "asc" } });

    if (!files || files.length === 0) return [];
    const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp|avif)$/i.test(f.name));

    const urls: Record<string, string> = {};
    for (const f of imageFiles) {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.name, {
        transform: { width: 320, height: 944, resize: "cover", quality: 70 },
      });
      urls[f.name] = urlData.publicUrl;
    }

    if (order && order.length > 0) {
      const orderedFilenames = order.filter((name) => urls[name]);
      const inOrder = new Set(orderedFilenames);
      const newFiles = imageFiles.map((f) => f.name).filter((name) => !inOrder.has(name));
      return [...orderedFilenames, ...newFiles].map((name) => urls[name]);
    }
    return imageFiles.map((f) => urls[f.name]);
  } catch {
    return [];
  }
}

export default async function Page() {
  const images = await getPortfolioImages();
  return <AuditLandingPage initialPortfolioImages={images} />;
}
