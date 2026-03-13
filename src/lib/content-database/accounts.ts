/* ── Social Account Configuration ── */

export interface SocialAccount {
  id: string;
  name: string;
  twitter?: string;      // handle (no @)
  twitterId?: string;    // numeric user ID for API calls
  linkedin?: string;     // profile slug
}

export const socialAccounts: SocialAccount[] = [
  {
    id: "dylan",
    name: "Dylan",
    twitter: "dylanevxns",
    twitterId: "1654424976382935040",
    linkedin: "dylan-evans-730908197",
  },
  {
    id: "ajay",
    name: "Ajay",
    twitter: "1ajaay",
    twitterId: "1298346990464577538",
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
