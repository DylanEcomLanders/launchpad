import { requireV2User } from "@/lib/v2/auth";

export default async function V2AppLayout({ children }: { children: React.ReactNode }) {
  await requireV2User();
  return children;
}
