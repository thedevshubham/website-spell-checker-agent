import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { startScan } from "../scan-agent.js";

export const scansRouter = Router();

const createScanSchema = z.object({
  startUrl: z.string().url()
});

scansRouter.post("/", async (request, response, next) => {
  try {
    const input = createScanSchema.parse(request.body);
    const scan = await startScan(input.startUrl);
    response.status(202).json({ scan });
  } catch (error) {
    next(error);
  }
});

scansRouter.get("/:scanId", async (request, response, next) => {
  try {
    const scan = await db.scan.findUnique({ where: { id: request.params.scanId } });
    if (!scan) return response.status(404).json({ error: "Scan not found" });
    response.json({ scan });
  } catch (error) {
    next(error);
  }
});

scansRouter.get("/:scanId/pages", async (request, response, next) => {
  try {
    const pages = await db.page.findMany({
      where: { scanId: request.params.scanId },
      orderBy: { url: "asc" }
    });
    response.json({ items: pages });
  } catch (error) {
    next(error);
  }
});

scansRouter.get("/:scanId/issues", async (request, response, next) => {
  try {
    const query = z.object({ category: z.string().optional(), pageUrl: z.string().url().optional() })
      .parse(request.query);
    const issues = await db.issue.findMany({
      where: { scanId: request.params.scanId, category: query.category, pageUrl: query.pageUrl },
      orderBy: { createdAt: "asc" }
    });
    response.json({ items: issues });
  } catch (error) {
    next(error);
  }
});

scansRouter.get("/:scanId/export.csv", async (request, response, next) => {
  try {
    const issues = await db.issue.findMany({
      where: { scanId: request.params.scanId },
      orderBy: { createdAt: "asc" }
    });
    const rows = [
      ["pageUrl", "elementType", "originalText", "matchedText", "suggestion", "category", "context"],
      ...issues.map((issue) => [
        issue.pageUrl,
        issue.elementType,
        issue.originalText,
        issue.matchedText,
        issue.suggestion ?? "",
        issue.category,
        issue.context
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    response.type("text/csv").attachment(`scan-${request.params.scanId}.csv`).send(csv);
  } catch (error) {
    next(error);
  }
});

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
