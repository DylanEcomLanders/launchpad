import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const articulatCF = localFont({
  src: [
    { path: "../fonts/ArticulatCF-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/ArticulatCF-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/ArticulatCF-DemiBold.otf", weight: "600", style: "normal" },
    { path: "../fonts/ArticulatCF-Bold.otf", weight: "700", style: "normal" },
  ],
  variable: "--font-articulat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Launchpad — Ecomlanders",
  description: "Internal tools for the Ecomlanders team",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`light ${inter.variable} ${articulatCF.variable}`}>
      <body className="font-body antialiased bg-[#FAFAFA] text-[#0A0A0A]">
        {children}
      </body>
    </html>
  );
}
