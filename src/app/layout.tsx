import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Launchpad — Ecomlanders",
  description: "Internal tools for the Ecomlanders team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${plusJakartaSans.variable} font-[family-name:var(--font-plus-jakarta)] antialiased bg-[#FAFAFA] text-[#0A0A0A]`}>
        {children}
      </body>
    </html>
  );
}
