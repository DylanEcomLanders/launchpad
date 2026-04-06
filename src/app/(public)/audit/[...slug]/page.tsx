import { redirect } from "next/navigation";

/* ── Clean audit vanity URLs ──
 * /audit/dylan         → /audit?ref=x-dylan-bio
 * /audit/dylan/x       → /audit?ref=x-dylan-post
 * /audit/dylan/linkedin → /audit?ref=li-dylan-post
 * /audit/dylan/tiktok  → /audit?ref=tiktok-dylan-bio
 * /audit/dylan/email   → /audit?ref=email-dylan-sig
 */

const PLATFORM_MAP: Record<string, (name: string) => string> = {
  x: (name) => `x-${name}-post`,
  linkedin: (name) => `li-${name}-post`,
  li: (name) => `li-${name}-post`,
  tiktok: (name) => `tiktok-${name}-bio`,
  email: (name) => `email-${name}-sig`,
};

export default function AuditRedirect({
  params,
}: {
  params: { slug: string[] };
}) {
  const [name, platform] = params.slug;

  if (!name) {
    redirect("/audit");
  }

  const cleanName = name.toLowerCase();

  if (!platform) {
    // /audit/dylan → default to X bio link
    redirect(`/audit?ref=x-${cleanName}-bio`);
  }

  const cleanPlatform = platform.toLowerCase();
  const refBuilder = PLATFORM_MAP[cleanPlatform];

  if (refBuilder) {
    redirect(`/audit?ref=${refBuilder(cleanName)}`);
  }

  // Unknown platform — just redirect to audit with name as ref
  redirect(`/audit?ref=${cleanName}-${cleanPlatform}`);
}
