import type { ReactNode } from "react";
import { WorkspaceNav } from "./nav";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      <WorkspaceNav />
      <div className="mx-auto max-w-[1240px] px-6 pb-20 pt-6">{children}</div>
    </div>
  );
}
