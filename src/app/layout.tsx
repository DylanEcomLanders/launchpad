import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeScript } from "@/components/theme";
import { SandboxRibbon } from "@/components/sandbox-ribbon";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Inter Tight - display/heading font. Slightly tighter than Inter, used for
// titles, section labels, sidebar nav. Brand-aligned per the type spec.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// JetBrains Mono - tabular numbers + monospace fields. Sits next to body type
// to read like a data sheet (Well-style).
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  title: "Launchpad - Ecomlanders",
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
    <html lang="en" className={`light ${inter.variable} ${interTight.variable} ${articulatCF.variable} ${jetBrainsMono.variable}`}>
      <head>
        <ThemeScript />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        {children}
        <SandboxRibbon />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js")`,
          }}
        />
      </body>
    </html>
  );
}
