import type { Metadata } from "next";
import StrategyShareClient from "./client";

export const metadata: Metadata = {
  title: "Strategy · Ecomlanders",
  robots: { index: false },
};

/* Public branded share for a strategy resource.
 *
 * Token is the resource id (random base36, effectively unguessable).
 * The strategist clicks "Generate branded version" on a file resource
 * in the engagement Sandbox; that copies this URL to clipboard. The
 * client opens it and sees the resource wrapped in Ecom Landers
 * branding.
 *
 * Client-rendered, no auth, designed to be shared externally.
 */
export default async function StrategyShare({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StrategyShareClient token={token} />;
}
