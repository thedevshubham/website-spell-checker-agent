import { z } from "zod";
import { config } from "./config.js";
import type { ContentBlock } from "./extractor.js";

const languageToolResponseSchema = z.object({
  matches: z.array(z.object({
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
    replacements: z.array(z.object({ value: z.string() })),
    context: z.object({ text: z.string() }),
    rule: z.object({
      id: z.string(),
      issueType: z.string().optional(),
      category: z.object({ id: z.string() })
    })
  }))
});

export type IssueCategory = "spelling" | "grammar" | "punctuation" | "word_choice";

export interface LanguageToolFinding {
  elementType: string;
  originalText: string;
  matchedText: string;
  suggestion: string | null;
  context: string;
  category: IssueCategory;
  ruleId: string;
}

function mapCategory(categoryId: string, issueType?: string): IssueCategory {
  const value = `${categoryId} ${issueType ?? ""}`.toLowerCase();
  if (value.includes("typo") || value.includes("misspell")) return "spelling";
  if (value.includes("punct")) return "punctuation";
  if (value.includes("style") || value.includes("word")) return "word_choice";
  return "grammar";
}

export async function checkBlock(block: ContentBlock): Promise<LanguageToolFinding[]> {
  const body = new URLSearchParams({ text: block.text, language: "en-US" });
  const response = await fetch(new URL("/v2/check", config.languageToolUrl), {
    method: "POST",
    body,
    signal: AbortSignal.timeout(config.languageToolTimeoutMs),
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });

  if (!response.ok) {
    throw new Error(`LanguageTool request failed with status ${response.status}`);
  }

  const result = languageToolResponseSchema.parse(await response.json());
  return result.matches.map((match) => ({
    elementType: block.elementType,
    originalText: block.text,
    matchedText: block.text.slice(match.offset, match.offset + match.length),
    suggestion: match.replacements[0]?.value ?? null,
    context: match.context.text,
    category: mapCategory(match.rule.category.id, match.rule.issueType),
    ruleId: match.rule.id
  }));
}

export function deduplicateFindings(findings: LanguageToolFinding[]): LanguageToolFinding[] {
  const unique = new Map<string, LanguageToolFinding>();
  for (const finding of findings) {
    const key = [
      finding.elementType,
      finding.matchedText.trim().toLowerCase(),
      finding.suggestion?.trim().toLowerCase() ?? "",
      finding.ruleId
    ].join("|");
    if (!unique.has(key)) unique.set(key, finding);
  }
  return [...unique.values()];
}
