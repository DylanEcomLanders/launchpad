"use client";
import dynamic from "next/dynamic";
const HookGen = dynamic(() => import("@/app/(dashboard)/tools/hook-generator/page"), { ssr: false });
export default function Page() { return <HookGen />; }
