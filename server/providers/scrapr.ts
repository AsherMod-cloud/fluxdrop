import { createRequire } from "node:module";
import type {
  MediaVariant,
  NormalizedDownload,
  SupportedPlatform,
} from "../../shared/downloader";

const require = createRequire(import.meta.url);

type ScrapeFunction = (
  url: string,
  options?: Record<string, unknown>
) => Promise<unknown>;
type ScraprPayload = {
  status?: boolean;
  message?: string;
  result?: {
    title?: string;
    thumbnail?: string;
    cover?: string;
    caption?: string;
    downloads?: Array<Record<string, unknown>>;
  };
};

export class ScraprProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraprProviderError";
  }
}

function loadScraper(path: string): ScrapeFunction {
  const loaded = require(`@coflyn/scrapr/lib/${path}`) as {
    scrape?: ScrapeFunction;
  };
  if (typeof loaded.scrape !== "function")
    throw new ScraprProviderError(`scrapr resolver ${path} is unavailable.`);
  return loaded.scrape;
}

function inferType(value: Record<string, unknown>) {
  const raw =
    `${value.type ?? ""} ${value.extension ?? ""} ${value.url ?? ""}`.toLowerCase();
  if (raw.includes("audio") || raw.includes("music") || raw.includes("mp3") || raw.includes("m4a"))
    return "audio";
  if (
    raw.includes("image") || raw.includes("photo") ||
    /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(String(value.url ?? ""))
  )
    return "image";
  return "video";
}

function inferExtension(type: string, value: Record<string, unknown>) {
  const explicit = String(value.extension ?? "")
    .replace(/^\./, "")
    .toLowerCase();
  if (explicit)
    return explicit === "mp4" && type === "audio" ? "mp3" : explicit;
  if (type === "audio") return "mp3";
  if (type === "image") return "jpg";
  return "mp4";
}

export function normalizeScraprPayload(
  payload: unknown,
  sourceUrl: string,
  platform: SupportedPlatform
): NormalizedDownload {
  const body = payload as ScraprPayload;
  if (body?.status !== true || !body.result)
    throw new ScraprProviderError(
      body?.message || "scrapr returned no public media."
    );
  const result = body.result;
  const seen = new Set<string>();
  const variants: MediaVariant[] = (result.downloads ?? [])
    .map(item => {
      const url = typeof item.url === "string" ? item.url : "";
      const type = inferType(item);
      return {
        type,
        quality:
          typeof item.quality === "string"
            ? item.quality
            : type === "image"
              ? "original"
              : "direct",
        extension: inferExtension(type, item),
        url,
      } satisfies MediaVariant;
    })
    .filter(item => item.url && !seen.has(item.url) && seen.add(item.url));
  if (!variants.length)
    throw new ScraprProviderError("scrapr returned no usable media links.");
  return {
    platform,
    sourceUrl,
    title: result.title?.trim() || "Untitled media",
    caption: result.caption?.trim() || "",
    cover: result.thumbnail || result.cover || "",
    variants,
  };
}

const resolverPaths: Record<SupportedPlatform, string[]> = {
  youtube: ["youtube/ytmp3gg", "youtube/ytmp3"],
  tiktok: ["tiktok/snaptik", "tiktok/tiktokio", "tiktok/ssstik"],
  instagram: ["instagram/direct", "instagram/indown"],
  facebook: ["facebook/snapsave"],
  x: ["twitter/direct", "twitter/tvd"],
  douyin: ["douyin/direct"],
  threads: ["threads/threadster"],
};

function mergeResults(base: NormalizedDownload | undefined, next: NormalizedDownload) {
  if (!base) return next;
  const seen = new Set(base.variants.map(variant => variant.url));
  return {
    ...base,
    title: base.title === "Untitled media" ? next.title : base.title,
    caption: base.caption || next.caption,
    cover: base.cover || next.cover,
    variants: [...base.variants, ...next.variants.filter(variant => !seen.has(variant.url))],
  };
}

export async function resolveScrapr(
  sourceUrl: string,
  platform: SupportedPlatform
): Promise<NormalizedDownload> {
  const failures: string[] = [];
  let aggregate: NormalizedDownload | undefined;
  for (const path of resolverPaths[platform]) {
    try {
      const raw = await loadScraper(path)(
        sourceUrl,
        platform === "youtube" ? { format: "mp4" } : undefined
      );
      const result = normalizeScraprPayload(raw, sourceUrl, platform);
      // SnapTik often returns video while TikTokIO/SSSTik expose Photo Mode slides and music.
      if (platform === "tiktok") {
        aggregate = mergeResults(aggregate, result);
        continue;
      }
      return result;
    } catch (error) {
      failures.push(
        `${path}: ${error instanceof Error ? error.message : "failed"}`
      );
      console.warn(
        `[Downloader] scrapr resolver failed: ${path}`,
        error instanceof Error ? error.message : error
      );
    }
  }
  if (aggregate?.variants.length) return aggregate;
  throw new ScraprProviderError(failures.join("; ") || "No scrapr resolver configured.");
}

export const SCRAPR_RESOLVER_PATHS = resolverPaths;
