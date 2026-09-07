import type { Metadata } from "next";
import "./work.css";

export const metadata: Metadata = {
  title: "Work — Ecomlanders",
  description:
    "Pages, not decks. A lookbook of shipped product and landing pages by Ecomlanders.",
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="work-root">
      <style>{`html,body,main{background:#08080A!important;color:#F3EFE6}`}</style>
      {children}
    </div>
  );
}
