import { crawlWebsite } from "./crawler.js";

const websiteUrl = process.argv[2];
if (!websiteUrl) {
  console.error("Usage: npm run crawl -- https://example.com");
  process.exitCode = 1;
} else {
  try {
    const pages = await crawlWebsite(websiteUrl);
    console.log(JSON.stringify(pages, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Scan failed");
    process.exitCode = 1;
  }
}
