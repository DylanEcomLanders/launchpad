import { getSections } from "@/lib/wiki-v2/data";
import { WikiShell } from "@/components/wiki-v2/WikiShell";

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const sections = getSections();
  return <WikiShell sections={sections}>{children}</WikiShell>;
}
