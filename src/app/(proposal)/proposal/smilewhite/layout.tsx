import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposal · Yorkshire Dental Suite × Ecomlanders",
  description: "Proposed Scope of Work. Conversion Engine proposal prepared for Yorkshire Dental Suite.",
  openGraph: {
    title: "Proposal · Yorkshire Dental Suite × Ecomlanders",
    description: "Proposed Scope of Work. Conversion Engine proposal for Yorkshire Dental Suite.",
    url: "https://ecomlanders.app/proposal/smilewhite",
    siteName: "Ecomlanders",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proposal · Yorkshire Dental Suite × Ecomlanders",
    description: "Proposed Scope of Work. Conversion Engine proposal for Yorkshire Dental Suite.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function YorkshireDentalProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
