import { describe, expect, it } from "vitest";
import { detectPlatform, normalizeRyzumiResponse } from "../shared/downloader";

describe("downloader helpers", () => {
  it("detects supported platforms from common hostnames", () => {
    expect(detectPlatform("https://youtu.be/demo")).toBe("youtube");
    expect(detectPlatform("https://www.tiktok.com/@demo/video/1")).toBe("tiktok");
    expect(detectPlatform("https://x.com/demo/status/1")).toBe("x");
    expect(detectPlatform("https://threads.net/@demo/post/1")).toBe("threads");
    expect(detectPlatform("https://example.com/video")).toBeNull();
  });

  it("normalizes grouped media and removes duplicate URLs", () => {
    const result = normalizeRyzumiResponse(
      {
        success: true,
        result: {
          url: "https://www.instagram.com/reel/demo",
          title: "Demo Reel",
          cover: "https://cdn.example.com/cover.jpg",
          media: {
            videos: [{ type: "video", quality: "hd", extension: "mp4", url: "https://cdn.example.com/demo.mp4" }],
            images: [{ type: "image", quality: "cover", extension: "jpg", url: "https://cdn.example.com/cover.jpg" }],
            all: [{ type: "video", quality: "hd", extension: "mp4", url: "https://cdn.example.com/demo.mp4" }],
          },
        },
      },
      "https://www.instagram.com/reel/demo",
    );

    expect(result.platform).toBe("instagram");
    expect(result.title).toBe("Demo Reel");
    expect(result.variants).toHaveLength(2);
  });
});
