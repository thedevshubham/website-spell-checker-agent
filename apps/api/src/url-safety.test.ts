import { describe, expect, it } from "vitest";
import { isCrawlableUrl, isPrivateIp, normalizeUrl } from "./url-safety.js";

describe("URL handling", () => {
  it("normalizes tracking parameters, fragments, and trailing slashes", () => {
    const url = normalizeUrl("https://example.com/about/?b=2&utm_source=test&a=1#team");
    expect(url.href).toBe("https://example.com/about?a=1&b=2");
  });

  it("blocks private addresses", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.20")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("keeps safe same-hostname pages", () => {
    expect(isCrawlableUrl(new URL("https://example.com/about"), "example.com")).toBe(true);
    expect(isCrawlableUrl(new URL("https://other.com/about"), "example.com")).toBe(false);
    expect(isCrawlableUrl(new URL("https://example.com/logout"), "example.com")).toBe(false);
  });
});
