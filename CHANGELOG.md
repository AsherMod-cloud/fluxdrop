# Changelog

## Experimental TikTok provider

- Added a server-side TikTok adapter backed by the pinned `@tobyg74/tiktok-api-dl` v1.3.7 package.
- Restricted integration to public TikTok URL resolution; FluxDrop does not receive, store, or forward TikTok account cookies.
- Normalized public TikTok video, image carousel, and music URLs into the existing FluxDrop media contract with deduplication and an 18-second adapter timeout.
- Added TikTok provider normalization tests and verified a public TikTok URL live, returning both MP4 video and MP3 audio variants without calling Ryzumi.
- The provider remains experimental because it depends on unofficial TikTok and third-party upstream paths; existing fallback behavior remains available if it becomes unavailable.
- Added a one-at-a-time in-flight guard around the package to prevent concurrent FluxDrop requests from amplifying the package's internal retry behavior.
- Verified in the browser that the existing result card renders the public TikTok metadata, cover, two MP4 variants, and the selectable Audio / MP3 tab.
- Verified a public TikTok Photo Mode post in the browser: FluxDrop rendered the Images mode, JPG media selection, and separate Audio / MP3 mode. A pure media-mode regression test is now executed by Vitest.
- Extracted the media result card into a reusable component and added a JSDOM interaction test that verifies Images, JPG selection, Audio / MP3 mode selection, and the selected-download callback.

## Fixed

- Fixed TikTok Photo Mode carousel deduplication: distinct image URLs with the same JPG format now remain selectable rather than collapsing to one option.
- Image result mode now labels each carousel item as `Slide 1`, `Slide 2`, and so on, and displays the exact total slide count.
- Verified the provided public TikTok Photo Mode post live: all 6 returned image slides render in FluxDrop alongside the Audio / MP3 mode.

## 2026-08-14

### Added

FluxDrop initial MVP with a dark futuristic landing page, liquid orb hero treatment, glassmorphism surfaces, magenta-cyan visual system, responsive mobile-first layout, universal media URL input, automatic detection for YouTube, TikTok, Instagram, Facebook, X, Douyin, and Threads, animated scanning state, typed Ryzumi REST API proxy, grouped media result variants, format and quality selection, localStorage download history, and explicit empty/error states.

### Engineering

The client calls the application tRPC procedure only. The server-side procedure forwards requests to the Ryzumi all-in-one endpoint, normalizes its response schema, applies an upstream timeout, and maps provider failures to user-safe errors. Vitest coverage was added for platform detection and media normalization.

### Fallback recovery

Added a server-only fallback chain for downloader resolution. Requests now try `/api/downloader/all-in-one` first, then use platform-specific endpoints when applicable: YouTube tries `ytmp4` followed by `ytmp3`; Facebook, Instagram, TikTok, Twitter, and Douyin use their dedicated routes. Fallback responses are normalized into the same media contract, and the browser still communicates only with the application proxy.

### Error handling fix

Diagnosed preview failures as upstream HTTP 403 responses from Ryzumi on every fallback endpoint, indicating server IP whitelist or ASN blocking rather than a client or tRPC serialization bug. The proxy now preserves the server-only architecture, logs the attempted routes and final status, and returns an actionable whitelist message instead of the generic upstream failure message. Regression coverage now includes the 403 mapping.

### Live resolver fix

After the backend egress IP was whitelisted, live probing exposed that platform-specific YouTube endpoints return raw metadata with `videoUrl` rather than the All-in-One `{ success, result }` envelope. The proxy now adapts both shapes into the shared media contract. A real preview mutation resolved a YouTube URL successfully, and the regression suite covers raw `ytmp4` payloads, whitelist errors, timeouts, and malformed responses.

### All-output media selection

The downloader now collects available media after one Analyze action. YouTube fallback requests for MP4 and MP3 run independently and are merged deterministically without duplicate URLs. Raw `ytmp3` responses now prefer the direct audio `url` field instead of the metadata `videoUrl`, preventing the audio variant from being deduplicated away. The result card now exposes Video/Audio/Image modes with format-specific options. Live verification returned both MP4 and MP3 variants from one request; typecheck, production build, and 13 tests passed.
