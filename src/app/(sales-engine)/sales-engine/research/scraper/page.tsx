"use client";
import dynamic from "next/dynamic";
const StoreIntel = dynamic(() => import("@/app/(dashboard)/tools/store-intel/page"), { ssr: false });
export default function Page() { return <StoreIntel />; }
