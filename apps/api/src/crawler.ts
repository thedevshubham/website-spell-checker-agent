import { config } from "./config.js";
import { extractContent, extractLinks, type ContentBlock } from "./extractor.js";
import { assertPublicUrl, isCrawlableUrl, normalizeUrl } from "./url-safety.js";

export interface CrawledPage {
  url: string;
  title: string | null;
  blocks: ContentBlock[];
  error?: string;
}

async function readLimitedResponse(response: Response): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > config.maxResponseBytes) throw new Error("Response is too large");

  const body = await response.arrayBuffer();
  if (body.byteLength > config.maxResponseBytes) throw new Error("Response is too large");
  return new TextDecoder().decode(body);
}

async function fetchHtml(url: URL, redirectsLeft = 3): Promise<{ html: string; finalUrl: URL }> {
  await assertPublicUrl(url);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(config.pageTimeoutMs),
    headers: { "user-agent": "WebsiteSpellChecker/0.1" }
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location || redirectsLeft === 0) throw new Error("Too many or invalid redirects");
    const redirectedUrl = normalizeUrl(location, url.href);
    if (redirectedUrl.hostname !== url.hostname) throw new Error("Cross-hostname redirect blocked");
    return fetchHtml(redirectedUrl, redirectsLeft - 1);
  }

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) throw new Error("Page is not HTML");

  return { html: await readLimitedResponse(response), finalUrl: url };
}

async function fetchHtmlWithRetry(url: URL): Promise<{ html: string; finalUrl: URL }> {
  try {
    return await fetchHtml(url);
  } catch {
    return fetchHtml(url);
  }
}

export async function crawlWebsite(input: string): Promise<CrawledPage[]> {
  const startUrl = normalizeUrl(input);
  await assertPublicUrl(startUrl);

  const queue = [startUrl];
  const queued = new Set([startUrl.href]);
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < config.crawlMaxPages) {
    const url = queue.shift();
    if (!url) break;

    try {
      const { html, finalUrl } = await fetchHtmlWithRetry(url);
      const blocks = extractContent(html);
      const title = blocks.find((block) => block.elementType === "title")?.text ?? null;
      pages.push({ url: finalUrl.href, title, blocks });

      for (const rawLink of extractLinks(html, finalUrl)) {
        const link = normalizeUrl(rawLink.href);
        if (!isCrawlableUrl(link, startUrl.hostname) || queued.has(link.href)) continue;
        queued.add(link.href);
        queue.push(link);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown page error";
      pages.push({ url: url.href, title: null, blocks: [], error: message });
    }
  }

  return pages;
}
