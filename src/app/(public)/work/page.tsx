import { getWorkCatalog } from "@/lib/work/catalog";
import { Lookbook } from "./lookbook";

export const revalidate = 60;

export default async function WorkIndexPage() {
  const catalog = await getWorkCatalog();
  return <Lookbook catalog={catalog} />;
}
