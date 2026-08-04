import * as cheerio from "cheerio";

export interface ContentBlock {
  elementType: string;
  text: string;
  context: string;
}

const selectors: ReadonlyArray<{ selector: string; elementType: string; attribute?: string }> = [
  { selector: "title", elementType: "title" },
  { selector: 'meta[name="description"]', elementType: "meta_description", attribute: "content" },
  { selector: "h1, h2, h3, h4, h5, h6", elementType: "heading" },
  { selector: "p", elementType: "paragraph" },
  { selector: "li", elementType: "list_item" },
  { selector: "button", elementType: "button" },
  { selector: "a", elementType: "link" },
  { selector: "label", elementType: "label" },
  { selector: "input[placeholder], textarea[placeholder]", elementType: "placeholder", attribute: "placeholder" },
  { selector: "img[alt]", elementType: "alt_text", attribute: "alt" },
  { selector: "[aria-label]", elementType: "aria_label", attribute: "aria-label" }
];

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function isUsefulText(text: string): boolean {
  if (!text || /^[\d\W_]+$/u.test(text)) return false;
  if (/^(?:https?:\/\/|www\.|\S+@\S+\.\S+$)/i.test(text)) return false;
  return true;
}

export function extractContent(html: string): ContentBlock[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, code, pre, [hidden], [aria-hidden='true']").remove();

  const blocks: ContentBlock[] = [];
  const seen = new Set<string>();

  for (const item of selectors) {
    $(item.selector).each((_index, element) => {
      const text = cleanText(item.attribute ? $(element).attr(item.attribute) ?? "" : $(element).text());
      const key = `${item.elementType}|${text}`;
      if (!isUsefulText(text) || seen.has(key)) return;

      seen.add(key);
      blocks.push({ elementType: item.elementType, text, context: text });
    });
  }

  return blocks;
}

export function extractLinks(html: string, pageUrl: URL): URL[] {
  const $ = cheerio.load(html);
  const links: URL[] = [];

  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      links.push(normalizeUrlForLink(href, pageUrl));
    } catch {
      // Invalid and unsupported links are ignored during discovery.
    }
  });

  return links;
}

function normalizeUrlForLink(href: string, pageUrl: URL): URL {
  const url = new URL(href, pageUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported link protocol");
  }
  url.hash = "";
  return url;
}
