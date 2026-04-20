import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposal — SmileWhite × Ecomlanders",
  description: "Proposed Scope of Work — Conversion Engine proposal prepared for Smile at the Occidental Suite.",
  openGraph: {
    title: "Proposal — SmileWhite × Ecomlanders",
    description: "Proposed Scope of Work — Conversion Engine proposal for Smile at the Occidental Suite.",
    url: "https://ecomlanders.app/proposal/smilewhite",
    siteName: "Ecomlanders",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proposal — SmileWhite × Ecomlanders",
    description: "Proposed Scope of Work — Conversion Engine proposal for Smile at the Occidental Suite.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SmileWhiteProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
