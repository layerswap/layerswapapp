
<br />
<div align="left">
  <h1 align="left">UI for Layerswap web application</h1>
</div>
 
This repository contains implementation of Layerswap UI



### Run locally


  ```sh
  pnpm install
  pnpm dev
  ```

### Routes

Pages and API routes use the normal `.tsx`, `.ts`, `.jsx`, or `.js` extensions.

Use a `.dev.mjs` entry for non-production tools, re-exporting the TypeScript component from its feature folder. The [Page 2 timeline](features/timeline/README.md) uses `pages/timeline.dev.mjs` to serve `/timeline` locally under `next dev` and on Vercel when `VERCEL_ENV` is `preview` or `development`, including optimized `next build` deployments. The public `pageExtensions` setting excludes the entry and its fixtures for `VERCEL_ENV=production` and for ordinary local production builds. Existing page filenames stay unchanged.

Pages can choose their wrapper with Next.js's `getLayout` convention. The default layout supplies the app's providers and analytics; the timeline returns its page directly so those providers never mount.

 
### Required environment variables

  ```yaml
  NEXT_PUBLIC_LS_API = https://api-dev.layerswap.cloud/
  NEXT_PUBLIC_API_KEY = mainnet #sandbox for testnets
  ```

### Faro browser observability

Set the collector URL and restart/rebuild the app to enable browser telemetry.

```yaml
NEXT_PUBLIC_FARO_COLLECTOR_URL: https://your-faro-collector.example/collect
NEXT_PUBLIC_FARO_SAMPLE_RATE: 1 # optional; defaults to all sessions
```

See the [Grafana guide](grafana/README.md) for configuration, dashboards,
tracing and source maps, and the [telemetry contract](grafana/faro-telemetry-contract.md)
for event fields and behavior.
