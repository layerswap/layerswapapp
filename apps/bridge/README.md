
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

Use a `.dev.mjs` entry for development-only routes, re-exporting the TypeScript component from its feature folder. The [Page 2 timeline](features/timeline/README.md) uses `pages/timeline.dev.mjs` to serve `/timeline` under `next dev`. The public `pageExtensions` setting admits `dev.mjs` only in development. Production excludes the entry and its fixtures entirely; existing page filenames stay unchanged.

Pages can choose their wrapper with Next.js's `getLayout` convention. The default layout supplies the app's providers and analytics; the timeline returns its page directly so those providers never mount.

 
### Required environment variables

  ```yaml
  NEXT_PUBLIC_LS_API = https://api-dev.layerswap.cloud/
  NEXT_PUBLIC_API_KEY = mainnet #sandbox for testnets
  ```
