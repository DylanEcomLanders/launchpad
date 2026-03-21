"use client";
import dynamic from "next/dynamic";
const Scraper = dynamic(() => import("@/app/(dashboard)/tools/prospect-scraper/page"), { ssr: false });
export default function Page() { return <Scraper />; }
