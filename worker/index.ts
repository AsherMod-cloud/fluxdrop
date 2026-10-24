import {
  detectPlatform,
  type MediaVariant,
  type NormalizedDownload,
  type SupportedPlatform,
} from "../shared/downloader";

// scrapr resolvers are CommonJS modules. Wrangler bundles these selected files only;
// the full Node/Express application is intentionally not imported into this Worker.
import { scrape as tiktokSnapTik } from "@coflyn/scrapr/lib/tiktok/snaptik";
import { scrape as tiktokIo } from "@coflyn/scrapr/lib/tiktok/tiktokio";
import { scrape as tiktokSsstik } from "@coflyn/scrapr/lib/tiktok/ssstik";
import { scrape as instagramDirect } from "@coflyn/scrapr/lib/instagram/direct";
import { scrape as instagramInDown } from "@coflyn/scrapr/lib/instagram/indown";
import { scrape as youtubeMp4 } from "@coflyn/scrapr/lib/youtube/ytmp3gg";
import { scrape as facebookSnapSave } from "@coflyn/scrapr/lib/facebook/snapsave";
import { scrape as twitterDirect } from "@coflyn/scrapr/lib/twitter/direct";
import { scrape as douyinDirect } from "@coflyn/scrapr/lib/douyin/direct";
import { scrape as threadsThreadster } from "@coflyn/scrapr/lib/threads/threadster";

type ScrapeResult = {
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
type Scraper = (
  url: string,
  options?: Record<string, unknown>
) => Promise<ScrapeResult>;

const resolvers: Record<SupportedPlatform, Scraper[]> = {
  youtube: [
    url => youtubeMp4(url, { format: "mp4" }),
    url => youtubeMp4(url, { format: "mp3" }),
  ],
  tiktok: [tiktokSnapTik, tiktokIo, tiktokSsstik],
  instagram: [instagramDirect, instagramInDown],
  facebook: [facebookSnapSave],
  x: [twitterDirect],
  douyin: [douyinDirect],
  threads: [threadsThreadster],
};

function normalize(
  payload: ScrapeResult,
  sourceUrl: string,
  platform: SupportedPlatform
): NormalizedDownload {
  if (payload.status !== true || !payload.result)
    throw new Error(payload.message || "scrapr returned no media");
  const seen = new Set<string>();
  const variants: MediaVariant[] = (payload.result.downloads ?? [])
    .map(item => {
      const url = typeof item.url === "string" ? item.url : "";
      const raw =
        `${item.type ?? ""} ${item.extension ?? ""} ${url}`.toLowerCase();
      const type =
        raw.includes("audio") || raw.includes("music") || raw.includes("mp3") || raw.includes("m4a")
          ? "audio"
          : raw.includes("image") || raw.includes("photo") || /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)
            ? "image"
            : "video";
      return {
        type,
        quality:
          typeof item.quality === "string"
            ? item.quality
            : type === "image"
              ? "original"
              : "direct",
        extension: type === "audio" ? "mp3" : type === "image" ? "jpg" : "mp4",
        url,
      };
    })
    .filter(item => item.url && !seen.has(item.url) && seen.add(item.url));
  if (!variants.length) throw new Error("scrapr returned no usable media");
  return {
    platform,
    sourceUrl,
    title: payload.result.title || "Untitled media",
    caption: payload.result.caption || "",
    cover: payload.result.thumbnail || payload.result.cover || "",
    variants,
  };
}

async function resolve(sourceUrl: string): Promise<NormalizedDownload> {
  const platform = detectPlatform(sourceUrl);
  if (!platform) throw new Error("This platform is not supported yet.");
  const failures: string[] = [];
  let aggregate: NormalizedDownload | undefined;
  for (const scraper of resolvers[platform]) {
    try {
      const result = normalize(await scraper(sourceUrl), sourceUrl, platform);
      if (platform === "tiktok") {
        const seen = new Set((aggregate?.variants ?? []).map(item => item.url));
        aggregate = aggregate
          ? { ...aggregate, variants: [...aggregate.variants, ...result.variants.filter(item => !seen.has(item.url))] }
          : result;
        continue;
      }
      // YouTube's second pass is intentionally merged for MP3 + MP4 output.
      if (
        platform === "youtube" &&
        result.variants.some(item => item.type === "video")
      ) {
        try {
          const audio = normalize(
            await resolvers.youtube[1]!(sourceUrl),
            sourceUrl,
            platform
          );
          result.variants = [
            ...result.variants,
            ...audio.variants.filter(
              item =>
                !result.variants.some(existing => existing.url === item.url)
            ),
          ];
        } catch (error) {
          failures.push(
            error instanceof Error ? error.message : "audio resolver failed"
          );
        }
      }
      return result;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "resolver failed");
    }
  }
  if (aggregate?.variants.length) return aggregate;
  throw new Error(failures.join("; ") || "No resolver succeeded.");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type TrpcBatchInput =
  | { url?: string; [key: string]: unknown }
  | Array<{ json?: { url?: string } }>;

export function extractInputUrl(body: TrpcBatchInput) {
  if (Array.isArray(body)) return body[0]?.json?.url;
  const batchItem = body["0"] as { json?: { url?: string } } | undefined;
  return body.url ?? batchItem?.json?.url;
}

function trpcError(message: string, code: string, httpStatus: number, path: string) {
  return json(
    [
      {
        error: {
          json: {
            message,
            code,
            data: { code, httpStatus, path },
          },
        },
      },
    ],
    httpStatus,
  );
}

export default {
  async fetch(
    request: Request,
    env: { ASSETS?: { fetch(request: Request): Promise<Response> } }
  ) {
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders });
    const url = new URL(request.url);
    if (
      url.pathname === "/api/resolve" ||
      url.pathname === "/api/trpc/downloader.resolve"
    ) {
      if (request.method !== "POST")
        return url.pathname.includes("/api/trpc/")
          ? trpcError("Method not allowed", "METHOD_NOT_SUPPORTED", 405, "downloader.resolve")
          : json({ error: "Method not allowed" }, 405);
      try {
        const body = (await request.json()) as TrpcBatchInput;
        const input = extractInputUrl(body);
        if (!input)
          return url.pathname.includes("/api/trpc/")
            ? trpcError("A valid URL is required.", "BAD_REQUEST", 400, "downloader.resolve")
            : json({ error: "A valid URL is required." }, 400);
        const result = await resolve(input);
        if (url.pathname.includes("/api/trpc/"))
          return json([{ result: { data: { json: result } } }]);
        return json(result);
      } catch (error) {
        if (url.pathname.includes("/api/trpc/"))
          return trpcError(
            error instanceof Error ? error.message : "Unable to resolve media.",
            "BAD_GATEWAY",
            502,
            "downloader.resolve",
          );
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Unable to resolve media.",
          },
          502
        );
      }
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return json({ name: "FluxDrop Worker", status: "ok" });
  },
} satisfies ExportedHandler;
