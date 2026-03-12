import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Launchpad — Ecomlanders",
  description: "Internal tools for the Ecomlanders team",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Launchpad",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`light ${inter.variable} ${articulatCF.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-body antialiased bg-[#FAFAFA] text-[#0A0A0A]">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js")`,
          }}
        />
      </body>
    </html>
  );
}
