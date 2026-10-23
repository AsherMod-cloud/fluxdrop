# TikTok Provider Evaluation: TobyG74/tiktok-api-dl

## Scope

Repository: https://github.com/TobyG74/tiktok-api-dl

## Verified findings

The repository is a Node.js library and CLI, not a hosted HTTP API. The primary `Downloader` function accepts a TikTok URL with a selectable internal downloader version and an optional proxy. Its responses include direct video addresses, image slides, music addresses, and metadata.

The primary downloader resolves TikTok URLs, uses a mobile TikTok user agent, and calls an undocumented TikTok feed endpoint. Secondary downloader implementations scrape SSSTik and MusicalDown. The dependency therefore removes Ryzumi IP allowlisting but does not remove TikTok anti-bot, upstream website breakage, proxy, or network-reputation risk.

The repository shows recent activity in April 2026 and its committed `LICENSE` is Apache-2.0. `package.json` still declares ISC, so preserve Apache attribution and resolve that inconsistency before redistributing a fork. The README currently contains unresolved Git conflict markers, a quality-control concern.

## FluxDrop fit

Use this only as a TikTok-specific server-side adapter for public URL resolution. Do not expose it to the browser, do not accept or store visitor TikTok cookies, and do not enable account-oriented features such as liked videos or profile collection. Map only public video, image, and music URLs into FluxDrop's existing normalized `MediaVariant` contract.

## Recommendation

Suitable for a local proof of concept and personal/public-content utility after testing from the intended server network. Not suitable as FluxDrop's sole production provider without a maintained fork, strict per-user rate limits, short timeouts, observability, and a second provider fallback. Do not use its bundled install script; pin a reviewed commit or vetted package version and integrate only the downloader module.
