export const SUPPORTED_PLATFORMS = [
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "x",
  "douyin",
  "threads",
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export type MediaVariant = {
  type: string;
  quality: string;
  extension: string;
  url: string;
};

export type RyzumiResponse = {
  success?: boolean;
  result?: {
    type?: string;
    url?: string;
    title?: string;
    caption?: string;
    cover?: string;
    media?: {
      all?: MediaVariant[];
      videos?: MediaVariant[];
      images?: MediaVariant[];
    };
    download?: string;
    downloadUrl?: string;
  };
};

export type NormalizedDownload = {
  platform: SupportedPlatform;
  sourceUrl: string;
  title: string;
  caption: string;
  cover: string;
  variants: MediaVariant[];
};

const platformMatchers: Array<[SupportedPlatform, RegExp]> = [
  ["youtube", /(?:youtube\.com|youtu\.be)$/i],
  ["tiktok", /(?:tiktok\.com)$/i],
  ["instagram", /(?:instagram\.com)$/i],
  ["facebook", /(?:facebook\.com|fb\.watch)$/i],
  ["x", /(?:x\.com|twitter\.com)$/i],
  ["douyin", /(?:douyin\.com)$/i],
  ["threads", /(?:threads\.net)$/i],
];

export function detectPlatform(value: string): SupportedPlatform | null {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return platformMatchers.find(([, matcher]) => matcher.test(hostname))?.[0] ?? null;
  } catch {
    return null;
  }
}

function uniqueVariants(variants: MediaVariant[]) {
  const seen = new Set<string>();
  return variants.filter((variant) => {
    if (!variant?.url || seen.has(variant.url)) return false;
    seen.add(variant.url);
    return true;
  });
}

export function normalizeRyzumiResponse(
  payload: RyzumiResponse,
  requestedUrl: string,
): NormalizedDownload {
  const result = payload.result ?? {};
  const media = result.media ?? {};
  const variants = uniqueVariants([
    ...(media.videos ?? []),
    ...(media.images ?? []),
    ...(media.all ?? []),
    ...((result.download || result.downloadUrl || result.url) && !result.media
      ? [{ type: "video", quality: "direct", extension: "mp4", url: result.download || result.downloadUrl || result.url || "" }]
      : []),
  ]);
  const platform = detectPlatform(requestedUrl) ?? detectPlatform(result.url || requestedUrl);
  if (!platform) throw new Error("Unsupported platform");

  return {
    platform,
    sourceUrl: requestedUrl,
    title: result.title || "Untitled media",
    caption: result.caption || "",
    cover: result.cover || "",
    variants,
  };
}
