"use client";
import dynamic from "next/dynamic";
const Outreach = dynamic(() => import("@/app/(dashboard)/tools/outreach/page"), { ssr: false });
export default function Page() { return <Outreach />; }
