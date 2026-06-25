# widget-react-host example

Demonstrates a host app integrating `@layerswap/widget-react`, which loads
the Layerswap widget at runtime from a Module-Federation remote. The host
bundle contains **only** `@layerswap/widget-react` (no widget code, no
wallet adapters, no `framer-motion`, etc.).

## Run locally

Two dev servers — the CDN-remote and this host app.

```bash
# Terminal 1 — serve the federated remote on :3100
pnpm --filter @layerswap/widget-cdn dev

# Terminal 2 — serve this example on :3001
pnpm --filter widget-react-host-example dev -- --host 127.0.0.1 --port 3001 --no-open
```

Then open `http://127.0.0.1:3001/`. The host page fetches the manifest at
`http://127.0.0.1:3100/manifest.json` from the local CDN dev-server, then
loads the `remoteEntry.js` it points at and mounts the widget.

Point at a production CDN by setting `VITE_LAYERSWAP_MANIFEST` (e.g.
`https://cdn.layerswap.io/v1/manifest.json`), and `VITE_LAYERSWAP_VERIFY=true`
to require a valid manifest signature.

## What's in the host bundle

Only `@layerswap/widget-react` (a few KB plus `@module-federation/runtime`).
React, react-dom, wagmi, viem, react-query, and zustand stay as the host's
own copies (declared peer-deps on `@layerswap/widget-react`) and are fed
into the MF shared scope so the remote uses those exact instances.

## Known follow-ups (not blockers)

- The local dev-server manifest is unsigned, so this example runs with
  `verify` off by default. Point it at a signed prod build and set
  `VITE_LAYERSWAP_VERIFY=true` to exercise signature verification.
