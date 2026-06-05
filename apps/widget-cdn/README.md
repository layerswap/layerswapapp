# @layerswap/widget-cdn

Rspack Module-Federation **remote** that exposes `@layerswap/widget` for
runtime delivery via `@layerswap/widget-react`.

- `name`: `layerswap_widget`
- `filename`: `remoteEntry.js`
- `exposes`: `./Widget`
- Shared singletons: `react`, `react-dom`, `wagmi`, `viem`,
  `@tanstack/react-query`, `zustand`

## Dev

```bash
pnpm dev
```

Serves the remote on `http://127.0.0.1:3100/remoteEntry.js`.

## Build (for CDN deploy)

```bash
pnpm build
```

Emits to `dist/` — content-hashed chunks plus `remoteEntry.js` and
`mf-manifest.json`. Upload behind a CDN with far-future immutable cache
headers on hashed assets and `no-cache` on the manifest.
