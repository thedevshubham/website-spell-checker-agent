import dns from "node:dns/promises";
import net from "node:net";

const blockedHostnames = new Set(["localhost", "metadata.google.internal"]);
const trackingParameters = new Set(["gclid", "fbclid"]);
const blockedPaths = [
  "/logout",
  "/signout",
  "/cart",
  "/checkout",
  "/account",
  "/admin"
];
const downloadExtensions = /\.(?:zip|pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|svg|mp[34]|avi|mov)$/i;

export function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    const first = parts[0] ?? 0;
    const second = parts[1] ?? 0;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return true;
}

export function normalizeUrl(input: string, base?: string): URL {
  const url = new URL(input, base);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not supported");
  }

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || trackingParameters.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url;
}

export function isCrawlableUrl(url: URL, hostname: string): boolean {
  return (
    url.hostname === hostname &&
    !blockedPaths.some((path) => url.pathname.toLowerCase().startsWith(path)) &&
    !downloadExtensions.test(url.pathname)
  );
}

export async function assertPublicUrl(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Private or local URLs are not allowed");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("The URL resolves to a private or unsupported address");
  }
}
