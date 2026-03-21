"use client";
import dynamic from "next/dynamic";
const PriceLists = dynamic(() => import("@/app/(dashboard)/tools/price-lists/page"), { ssr: false });
export default function Page() { return <PriceLists />; }
