import { z } from "zod";
import { config } from "./config.js";
import type { LanguageToolFinding } from "./languagetool.js";

export const llmReviewSchema = z.object({
  isLikelyIssue: z.boolean(),
  suggestion: z.string().nullable(),
  explanation: z.string(),
  category: z.enum(["spelling", "grammar", "punctuation", "word_choice"])
});

const ollamaResponseSchema = z.object({
  message: z.object({ content: z.string() })
});

export type LlmReview = z.infer<typeof llmReviewSchema>;

export function parseLlmReview(value: string): LlmReview {
  return llmReviewSchema.parse(JSON.parse(value));
}

export function shouldReviewFinding(finding: LanguageToolFinding): boolean {
  return finding.category === "word_choice";
}

export async function reviewFinding(finding: LanguageToolFinding): Promise<LlmReview | null> {
  if (!config.ollamaEnabled || !shouldReviewFinding(finding)) return null;

  try {
    const response = await fetch(new URL("/api/chat", config.ollamaUrl), {
      method: "POST",
      signal: AbortSignal.timeout(config.ollamaTimeoutMs),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        think: false,
        format: "json",
        messages: [
          {
            role: "system",
            content: [
              "You are reviewing a possible writing issue found on a website.",
              "Judge only the supplied text and context. Use US English.",
              "Do not rewrite unrelated text. Return valid JSON with isLikelyIssue, suggestion, explanation, and category.",
              "The suggestion must be the exact replacement for matchedText, using the same grammatical form.",
              "Mark the finding false when the original wording is acceptable."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(finding)
          }
        ]
      })
    });

    if (!response.ok) return null;
    const result = ollamaResponseSchema.parse(await response.json());
    return parseLlmReview(result.message.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ollama review failed";
    console.info({ stage: "ollama", error: message });
    return null;
  }
}
