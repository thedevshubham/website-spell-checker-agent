import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanPage } from "./ScanPage";

const api = vi.hoisted(() => ({
  getScan: vi.fn(),
  getPages: vi.fn(),
  getIssues: vi.fn()
}));

vi.mock("../api", () => ({ ...api, apiUrl: "http://localhost:4000" }));
afterEach(cleanup);

describe("ScanPage", () => {
  it("loads a completed report and filters its issues", async () => {
    api.getScan.mockResolvedValue({
      id: "scan-1",
      startUrl: "https://example.com",
      status: "completed",
      pagesDiscovered: 1,
      pagesProcessed: 1,
      issuesFound: 2
    });
    api.getPages.mockResolvedValue([{ id: "page-1", url: "https://example.com", status: "completed" }]);
    api.getIssues.mockResolvedValue([
      { id: "1", pageUrl: "https://example.com", elementType: "heading", originalText: "Welcom", matchedText: "Welcom", suggestion: "Welcome", category: "spelling", context: "Welcom", source: "languagetool" },
      { id: "2", pageUrl: "https://example.com", elementType: "paragraph", originalText: "A sentence", matchedText: "sentence", suggestion: "sentence.", category: "punctuation", context: "A sentence", source: "languagetool" }
    ]);

    render(<ScanPage scanId="scan-1" />);
    await waitFor(() => expect(screen.getByText("Welcom", { selector: ".context" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "punctuation" } });
    expect(screen.queryByText("Welcom", { selector: ".context" })).not.toBeInTheDocument();
    expect(screen.getByText("A sentence", { selector: ".context" })).toBeInTheDocument();
  });
});
