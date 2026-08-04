import { db } from "./db.js";
import { crawlWebsite } from "./crawler.js";
import { checkBlock, deduplicateFindings, type LanguageToolFinding } from "./languagetool.js";
import { reviewFinding, shouldReviewFinding } from "./ollama.js";
import { assertPublicUrl, normalizeUrl } from "./url-safety.js";

export async function startScan(input: string) {
  const startUrl = normalizeUrl(input);
  await assertPublicUrl(startUrl);

  const scan = await db.scan.create({
    data: { startUrl: startUrl.href, hostname: startUrl.hostname }
  });

  setImmediate(() => {
    void processScan(scan.id, startUrl.href);
  });

  return scan;
}

async function processScan(scanId: string, startUrl: string): Promise<void> {
  try {
    const crawledPages = await crawlWebsite(startUrl);
    await db.scan.update({
      where: { id: scanId },
      data: { pagesDiscovered: crawledPages.length }
    });

    for (const crawledPage of crawledPages) {
      const page = await db.page.create({
        data: {
          scanId,
          url: crawledPage.url,
          title: crawledPage.title
        }
      });

      if (crawledPage.error) {
        await finishPage(scanId, page.id, "failed", crawledPage.error, 0);
        continue;
      }

      try {
        const findings: LanguageToolFinding[] = [];
        for (const block of crawledPage.blocks) {
          findings.push(...await checkBlock(block));
        }
        const uniqueFindings = deduplicateFindings(findings);
        const reviewedFindings: Array<LanguageToolFinding & { source: "languagetool" | "hybrid" }> = [];

        for (const finding of uniqueFindings) {
          const review = await reviewFinding(finding);
          if (review && !review.isLikelyIssue) continue;

          reviewedFindings.push({
            ...finding,
            suggestion: review?.suggestion ?? finding.suggestion,
            category: review?.category ?? finding.category,
            source: review && shouldReviewFinding(finding) ? "hybrid" : "languagetool"
          });
        }

        if (reviewedFindings.length > 0) {
          await db.issue.createMany({
            data: reviewedFindings.map((finding) => ({
              scanId,
              pageId: page.id,
              pageUrl: crawledPage.url,
              ...finding
            }))
          });
        }

        await finishPage(scanId, page.id, "completed", null, reviewedFindings.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Page checking failed";
        await finishPage(scanId, page.id, "failed", message, 0);
      }
    }

    await db.scan.update({
      where: { id: scanId },
      data: { status: "completed", completedAt: new Date() }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    console.error({ scanId, stage: "scan", error: message });
    await db.scan.update({
      where: { id: scanId },
      data: { status: "failed", errorMessage: message, completedAt: new Date() }
    });
  }
}

async function finishPage(
  scanId: string,
  pageId: string,
  status: "completed" | "failed",
  errorMessage: string | null,
  issueCount: number
): Promise<void> {
  await db.$transaction([
    db.page.update({ where: { id: pageId }, data: { status, errorMessage } }),
    db.scan.update({
      where: { id: scanId },
      data: {
        pagesProcessed: { increment: 1 },
        issuesFound: { increment: issueCount }
      }
    })
  ]);
}
