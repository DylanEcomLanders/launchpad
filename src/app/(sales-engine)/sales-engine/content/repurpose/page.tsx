"use client";
import dynamic from "next/dynamic";
const Repurposer = dynamic(() => import("@/app/(dashboard)/tools/content-repurposer/page"), { ssr: false });
export default function Page() { return <Repurposer />; }
