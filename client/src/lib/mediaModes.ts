import type { MediaVariant } from "@shared/downloader";

export type MediaMode = "video" | "audio" | "image";

export function getMediaMode(variant: MediaVariant): MediaMode {
  const type = variant.type?.toLowerCase();
  if (type?.includes("audio") || variant.extension?.toLowerCase() === "mp3") return "audio";
  if (type?.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(variant.extension?.toLowerCase())) return "image";
  return "video";
}

export function getDistinctResultVariants(variants: MediaVariant[]) {
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const mode = getMediaMode(variant);
    // Carousel slides can share the same quality and extension. Their unique URL,
    // not their format metadata, identifies a distinct image that must be selectable.
    const key = mode === "image" ? `image-${variant.url}` : `${mode}-${variant.quality}-${variant.extension}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getAvailableMediaModes(variants: MediaVariant[]): MediaMode[] {
  return Array.from(new Set(getDistinctResultVariants(variants).map(getMediaMode)));
}

export function getVariantsForMode(variants: MediaVariant[], mode: MediaMode) {
  return getDistinctResultVariants(variants).filter((variant) => getMediaMode(variant) === mode);
}
