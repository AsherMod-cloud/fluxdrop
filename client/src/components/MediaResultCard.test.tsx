// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaResultCard } from "./MediaResultCard";

describe("MediaResultCard TikTok Photo Mode", () => {
  it("renders Images by default, then exposes its JPG option and the separate Audio / MP3 mode", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<MediaResultCard
      result={{
        platform: "tiktok",
        sourceUrl: "https://www.tiktok.com/@creator/photo/123456789",
        title: "TikTok photo post",
        caption: "A public carousel",
        cover: "https://cdn.example/cover.jpg",
        variants: [
          { type: "image", quality: "original", extension: "jpg", url: "https://cdn.example/slide-1.jpg" },
          { type: "image", quality: "original", extension: "jpg", url: "https://cdn.example/slide-2.jpg" },
          { type: "audio", quality: "original", extension: "mp3", url: "https://cdn.example/audio.mp3" },
        ],
      }}
      onDownload={onDownload}
    />);

    expect(screen.getByRole("tab", { name: "Images" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Choose a slide")).toBeTruthy();
    expect(screen.getByText("2 slides available")).toBeTruthy();
    expect(screen.getAllByRole("button").some((button) => button.textContent?.includes("Slide 1") && button.textContent?.includes("JPG"))).toBe(true);
    expect(screen.getAllByRole("button").some((button) => button.textContent?.includes("Slide 2") && button.textContent?.includes("JPG"))).toBe(true);
    await user.click(screen.getByRole("tab", { name: "Audio / MP3" }));
    expect(screen.getByRole("tab", { name: "Audio / MP3" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("button").some((button) => button.textContent?.includes("MP3") && button.textContent?.includes("audio"))).toBe(true);
    await user.click(screen.getByRole("button", { name: /Download selected/i }));
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ extension: "mp3", type: "audio" }));
  });
});
