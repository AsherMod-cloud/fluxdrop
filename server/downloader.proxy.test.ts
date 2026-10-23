import { afterEach, describe, expect, it, vi } from "vitest";

const scrapr = vi.hoisted(() => ({ resolveScrapr: vi.fn() }));
vi.mock("./providers/scrapr", () => ({
  resolveScrapr: scrapr.resolveScrapr,
  ScraprProviderError: class ScraprProviderError extends Error {},
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const input = { url: "https://www.youtube.com/watch?v=demo" };
function caller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

afterEach(() => scrapr.resolveScrapr.mockReset());

describe("downloader.resolve scrapr proxy", () => {
  it("returns the normalized scrapr contract", async () => {
    scrapr.resolveScrapr.mockResolvedValue({
      platform: "youtube",
      sourceUrl: input.url,
      title: "Demo",
      caption: "",
      cover: "https://cdn.example/cover.jpg",
      variants: [
        {
          type: "video",
          quality: "720p",
          extension: "mp4",
          url: "https://cdn.example/demo.mp4",
        },
      ],
    });
    const result = await caller().downloader.resolve(input);
    expect(result.title).toBe("Demo");
    expect(result.variants[0]?.extension).toBe("mp4");
    expect(scrapr.resolveScrapr).toHaveBeenCalledWith(input.url, "youtube");
  });

  it("rejects unsupported URLs before calling scrapr", async () => {
    await expect(
      caller().downloader.resolve({ url: "https://example.com/item" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(scrapr.resolveScrapr).not.toHaveBeenCalled();
  });

  it("maps resolver failures to a bad gateway", async () => {
    scrapr.resolveScrapr.mockRejectedValue(new Error("all resolvers failed"));
    await expect(caller().downloader.resolve(input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    });
  });
});
