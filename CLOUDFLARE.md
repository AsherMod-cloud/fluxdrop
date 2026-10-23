# FluxDrop on Cloudflare Workers

FluxDrop now uses `@coflyn/scrapr` server-side instead of the Ryzumi IP-whitelist API. The regular Manus/Node development server keeps the existing tRPC contract, while `worker/index.ts` is a small Cloudflare Worker entrypoint that exposes:

- `POST /api/resolve` with `{ "url": "https://..." }`
- `POST /api/trpc/downloader.resolve` with the tRPC batch input used by the existing client
- static Vite assets through the `ASSETS` binding

Build and dry-run the Worker with:

```bash
pnpm build:worker
```

Deploy it with an authenticated Wrangler session:

```bash
npx wrangler login
pnpm deploy:cf
```

The Worker intentionally imports only the selected scrapr resolvers. It does not import Express, Drizzle, Manus OAuth, Puppeteer, or the full scrapr root index. This keeps the deployment small, but some upstream web scrapers can still fail when their source website changes, rate-limits Cloudflare egress, or requires browser automation. For production, treat each resolver as a best-effort provider and add another resolver to the platform array when needed.

The existing UI remains unchanged and continues to call the server-side contract. Do not expose provider calls directly from the browser.