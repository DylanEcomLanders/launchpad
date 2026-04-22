import { getOpsWikiModule } from "@/lib/ops-wiki";
import { SalesDeckPresentation } from "./presentation";

export default function SalesDeckPage() {
  const mod = getOpsWikiModule("ce-sales-deck");
  return <SalesDeckPresentation markdown={mod?.content ?? ""} />;
}
