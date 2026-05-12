import { getOpsWikiModule } from "@/lib/ops-wiki";
import { getProjects } from "@/lib/portfolio-v2/data";
import { SalesDeckPresentation } from "./presentation";

export const dynamic = "force-dynamic";

export default async function SalesDeckPage() {
  const mod = getOpsWikiModule("ce-sales-deck");
  const projects = await getProjects().catch(() => []);
  const coverImages = projects.flatMap((p) => [
    ...(p.desktop_slices ?? []).map((s) => s.url),
    ...(p.mobile_slices ?? []).map((s) => s.url),
  ]);
  return <SalesDeckPresentation markdown={mod?.content ?? ""} coverImages={coverImages} />;
}
