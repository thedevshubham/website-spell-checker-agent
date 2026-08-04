import { afterEach, describe, expect, it, vi } from "vitest";
import { checkBlock, deduplicateFindings, type LanguageToolFinding } from "./languagetool.js";

afterEach(() => vi.unstubAllGlobals());

describe("checkBlock", () => {
  it("maps a LanguageTool response back to its content block", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      matches: [{
        offset: 0,
        length: 6,
        replacements: [{ value: "Welcome" }],
        context: { text: "Welcom to our store" },
        rule: {
          id: "MORFOLOGIK_RULE_EN_US",
          issueType: "misspelling",
          category: { id: "TYPOS" }
        }
      }]
    }), { status: 200 })));

    const findings = await checkBlock({
      elementType: "heading",
      text: "Welcom to our store",
      context: "Welcom to our store"
    });

    expect(findings[0]).toMatchObject({
      matchedText: "Welcom",
      suggestion: "Welcome",
      category: "spelling",
      elementType: "heading"
    });
  });
});

describe("deduplicateFindings", () => {
  it("keeps one identical finding per page", () => {
    const finding: LanguageToolFinding = {
      elementType: "heading",
      originalText: "Welcom",
      matchedText: "Welcom",
      suggestion: "Welcome",
      context: "Welcom",
      category: "spelling",
      ruleId: "MORFOLOGIK_RULE_EN_US"
    };

    expect(deduplicateFindings([finding, finding])).toEqual([finding]);
  });
});
