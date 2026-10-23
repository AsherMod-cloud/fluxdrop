import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  detectPlatform,
  type NormalizedDownload,
} from "../../shared/downloader";
import { publicProcedure, router } from "../_core/trpc";
import { resolveScrapr, ScraprProviderError } from "../providers/scrapr";

export const downloaderRouter = router({
  resolve: publicProcedure
    .input(z.object({ url: z.string().trim().url().max(2048) }))
    .mutation(async ({ input }) => {
      const platform = detectPlatform(input.url);
      if (!platform)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This platform is not supported yet.",
        });

      try {
        const result: NormalizedDownload = await resolveScrapr(
          input.url,
          platform
        );
        console.info("[Downloader] scrapr media output received", {
          platform,
          variants: result.variants.map(variant => ({
            type: variant.type,
            extension: variant.extension,
            quality: variant.quality,
          })),
        });
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "scrapr resolver failed";
        console.error("[Downloader] no usable scrapr output", {
          platform,
          message,
        });
        if (
          error instanceof ScraprProviderError &&
          /timed out|timeout/i.test(message)
        ) {
          throw new TRPCError({
            code: "TIMEOUT",
            message:
              "The media provider took too long to respond. Please retry with the same link.",
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "We could not resolve this link right now. Please try again in a moment.",
        });
      }
    }),
});
