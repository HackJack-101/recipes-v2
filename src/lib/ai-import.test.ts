import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { htmlToText } = await import("./ai-import");

describe("htmlToText", () => {
  it("keeps the title, recipe JSON-LD and visible text, drops scripts and chrome", () => {
    const text = htmlToText(`
      <html><head><title>Best crêpes</title>
        <script type="application/ld+json">{"@type":"Recipe","name":"Crêpes"}</script>
        <script>trackUser()</script><style>body{}</style>
      </head><body><nav>Menu</nav><main><h1>Crêpes</h1><p>250 g   flour</p></main><footer>©</footer></body></html>`);
    expect(text).toContain("Title: Best crêpes");
    expect(text).toContain('"@type":"Recipe"');
    expect(text).toContain("Crêpes\n250 g flour");
    expect(text).not.toContain("trackUser");
    expect(text).not.toContain("Menu");
  });
});
