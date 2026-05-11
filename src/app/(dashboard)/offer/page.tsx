import OfferHubClient from "./offer-hub-client";
import { getProjects } from "@/lib/portfolio-v2/data";

export const dynamic = "force-dynamic";

export default async function OfferHubPage() {
  const projects = await getProjects().catch(() => []);
  const previewImages = projects
    .flatMap((p) => [
      ...(p.desktop_slices ?? []).map((s) => s.url),
      ...(p.mobile_slices ?? []).map((s) => s.url),
    ])
    .slice(0, 16);

  return <OfferHubClient previewImages={previewImages} />;
}
