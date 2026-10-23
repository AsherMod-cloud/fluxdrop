import { describe, expect, it } from "vitest";
import { normalizeScraprPayload } from "./providers/scrapr";

describe("scrapr provider normalization", () => {
  it("maps video, photo slides, and music into the shared media contract", () => {
    const result = normalizeScraprPayload(
      {
        status: true,
        result: {
          title: "Photo Mode post",
          thumbnail: "https://cdn.example/cover.jpg",
          downloads: [
            {
              type: "mp4",
              quality: "HD",
              url: "https://cdn.example/video.mp4",
            },
            { type: "photo", url: "https://cdn.example/slide-1.jpg" },
            { type: "music", url: "https://cdn.example/audio.mp3" },
          ],
        },
      },
      "https://www.tiktok.com/@creator/photo/123",
      "tiktok"
    );
    expect(result.variants).toEqual([
      {
        type: "video",
        quality: "HD",
        extension: "mp4",
        url: "https://cdn.example/video.mp4",
      },
      {
        type: "image",
        quality: "original",
        extension: "jpg",
        url: "https://cdn.example/slide-1.jpg",
      },
      {
        type: "audio",
        quality: "direct",
        extension: "mp3",
        url: "https://cdn.example/audio.mp3",
      },
    ]);
  });

  it("rejects unsuccessful or empty scrapr payloads", () => {
    expect(() =>
      normalizeScraprPayload(
        { status: false, message: "blocked" },
        "https://www.tiktok.com/@creator/video/123",
        "tiktok"
      )
    ).toThrow("blocked");
    expect(() =>
      normalizeScraprPayload(
        { status: true, result: { downloads: [] } },
        "https://www.tiktok.com/@creator/video/123",
        "tiktok"
      )
    ).toThrow("usable media");
  });
});
