/* ── Social Account Configuration ── */

export interface SocialAccount {
  id: string;
  name: string;
  twitter?: string;   // handle (no @)
  linkedin?: string;  // profile slug
}

export const socialAccounts: SocialAccount[] = [
  {
    id: "dylan",
    name: "Dylan",
    twitter: "dylanevxns",
    linkedin: "dylan-evans-730908197",
  },
  {
    id: "ajay",
    name: "Ajay",
    twitter: "1ajaay",
    linkedin: "ajay-landing-pages-and-cro-shopify-brands",
  },
];

export function getAccountById(id: string): SocialAccount | undefined {
  return socialAccounts.find((a) => a.id === id);
}

export function getProfileUrl(
  account: SocialAccount,
  platform: "twitter" | "linkedin"
): string | null {
  if (platform === "twitter" && account.twitter) {
    return `https://x.com/${account.twitter}`;
  }
  if (platform === "linkedin" && account.linkedin) {
    return `https://www.linkedin.com/in/${account.linkedin}/recent-activity/all/`;
  }
  return null;
}
