import { describe, expect, it } from "vitest";
import { getAvailableMediaModes, getVariantsForMode } from "./mediaModes";

describe("result-card media modes", () => {
  it("exposes TikTok photo-carousel images as the Images result mode without hiding its audio track", () => {
    const variants = [
      { type: "image", quality: "original", extension: "jpg", url: "https://cdn.example/slide-1.jpg" },
      { type: "image", quality: "original", extension: "jpg", url: "https://cdn.example/slide-2.jpg" },
      { type: "audio", quality: "original", extension: "mp3", url: "https://cdn.example/sound.mp3" },
    ];

    expect(getAvailableMediaModes(variants)).toEqual(["image", "audio"]);
    expect(getVariantsForMode(variants, "image")).toHaveLength(2);
    expect(getVariantsForMode(variants, "image")[0]?.extension).toBe("jpg");
    expect(getVariantsForMode(variants, "image")[1]?.url).toBe("https://cdn.example/slide-2.jpg");
    expect(getVariantsForMode(variants, "audio")[0]?.extension).toBe("mp3");
  });
});
