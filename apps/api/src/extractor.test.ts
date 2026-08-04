import { describe, expect, it } from "vitest";
import { extractContent } from "./extractor.js";

describe("extractContent", () => {
  it("extracts visible structured content and ignores technical content", () => {
    const blocks = extractContent(`
      <html>
        <head><title>Example Store</title><script>ignore me</script></head>
        <body>
          <h1>Welcom to our store</h1>
          <p>Our plans compliments your workflow.</p>
          <button>Add to chart</button>
          <p hidden>Hidden text</p>
        </body>
      </html>
    `);

    expect(blocks).toEqual([
      { elementType: "title", text: "Example Store", context: "Example Store" },
      { elementType: "heading", text: "Welcom to our store", context: "Welcom to our store" },
      {
        elementType: "paragraph",
        text: "Our plans compliments your workflow.",
        context: "Our plans compliments your workflow."
      },
      { elementType: "button", text: "Add to chart", context: "Add to chart" }
    ]);
  });
});
