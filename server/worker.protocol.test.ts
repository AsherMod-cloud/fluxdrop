import { describe, expect, it } from "vitest";
import { extractInputUrl } from "../worker/index";

describe("Cloudflare Worker tRPC protocol", () => {
  it("extracts the input from the object batch format used by httpBatchLink", () => {
    expect(
      extractInputUrl({
        "0": { json: { url: "https://www.youtube.com/watch?v=demo" } },
      })
    ).toBe("https://www.youtube.com/watch?v=demo");
  });

  it("also supports direct REST input and array batches", () => {
    expect(
      extractInputUrl({ url: "https://www.tiktok.com/@demo/video/1" })
    ).toBe("https://www.tiktok.com/@demo/video/1");
    expect(
      extractInputUrl([
        { json: { url: "https://www.instagram.com/reel/demo/" } },
      ])
    ).toBe("https://www.instagram.com/reel/demo/");
  });
});
