"use client";
import dynamic from "next/dynamic";
const Portfolio = dynamic(() => import("@/app/(dashboard)/tools/portfolio/page"), { ssr: false });
export default function Page() { return <Portfolio />; }
