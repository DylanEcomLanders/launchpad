/* ── SSRF guard ──
 *
 * Validates a user-supplied URL before the server fetches it. Blocks the
 * classic SSRF targets: cloud metadata (169.254.169.254), loopback,
 * private RFC1918 ranges, link-local, and non-HTTP(S) schemes. Resolves
 * the hostname via DNS so an attacker can't hide an internal IP behind a
 * public domain that resolves to a private address.
 *
 * Usage (server-only):
 *   const safe = await assertPublicUrl(userUrl);   // throws SsrfError if not
 *   const res = await fetch(safe.href, ...);
 */

import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** True if an IPv4/IPv6 literal is in a private, loopback, link-local,
 *  unique-local, or otherwise non-public range. */
function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true; // malformed → reject
    const [a, b] = p;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local fc00::/7
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 → check the embedded v4
      const v4 = lower.split(":").pop() ?? "";
      if (net.isIP(v4) === 4) return isPrivateIp(v4);
    }
    return false;
  }
  return true; // not a valid IP literal → reject
}

/**
 * Validate that `raw` is a public http(s) URL safe to fetch server-side.
 * Returns the parsed URL on success; throws SsrfError otherwise.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Blocked scheme: ${url.protocol}`);
  }

  // Reject non-standard ports (only 80/443 and the default empty port).
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new SsrfError(`Blocked port: ${url.port}`);
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new SsrfError("Blocked host");
  }

  // If the host is already an IP literal, check it directly.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("Blocked private address");
    return url;
  }

  // Otherwise resolve all A/AAAA records and reject if ANY is private
  // (defends against DNS rebinding to a single bad record).
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("Could not resolve host");
  }
  if (records.length === 0) throw new SsrfError("Host did not resolve");
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new SsrfError("Resolves to a private address");
  }
  return url;
}

/** Boolean convenience wrapper that never throws. */
export async function isPublicUrl(raw: string): Promise<boolean> {
  try {
    await assertPublicUrl(raw);
    return true;
  } catch {
    return false;
  }
}
