"use client";
import dynamic from "next/dynamic";
const ContentEngine = dynamic(() => import("@/app/(dashboard)/tools/content-db/page"), { ssr: false });
export default function Page() { return <ContentEngine />; }
