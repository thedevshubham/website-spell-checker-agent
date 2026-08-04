import { describe, expect, it } from "vitest";
import { parseLlmReview, shouldReviewFinding } from "./ollama.js";
import type { LanguageToolFinding } from "./languagetool.js";

const finding: LanguageToolFinding = {
  elementType: "paragraph",
  originalText: "Our plans compliment your workflow.",
  matchedText: "compliment",
  suggestion: "complement",
  context: "Our plans compliment your workflow.",
  category: "word_choice",
  ruleId: "CONFUSION_RULE"
};

describe("Ollama review", () => {
  it("validates structured model output", () => {
    expect(parseLlmReview(JSON.stringify({
      isLikelyIssue: true,
      suggestion: "complement",
      explanation: "Complement means to enhance.",
      category: "word_choice"
    })).isLikelyIssue).toBe(true);
  });

  it("reviews only word-choice findings", () => {
    expect(shouldReviewFinding(finding)).toBe(true);
    expect(shouldReviewFinding({ ...finding, category: "spelling" })).toBe(false);
  });
});
