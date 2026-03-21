"use client";
import dynamic from "next/dynamic";
const Revenue = dynamic(() => import("@/app/(dashboard)/tools/revenue/page"), { ssr: false });
export default function Page() { return <Revenue />; }
