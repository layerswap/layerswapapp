# cdn-embed example

Demonstrates loading `@layerswap/widget` at runtime from a Module-Federation
remote, with the integrator's bundle containing **only** `@layerswap/widget-react`
(no widget code, no wallet adapters, no `framer-motion`, etc.).

## Run locally

Two dev servers — the CDN-remote and this host app.

```bash
# Terminal 1 — serve the federated remote on :3100
pnpm --filter @layerswap/widget-cdn dev

# Terminal 2 — serve this example on :3001
pnpm --filter cdn-embed-example dev -- --host 127.0.0.1 --port 3001 --no-open
```

Then open `http://127.0.0.1:3001/`. The host page loads `remoteEntry.js`
from the local CDN dev-server and mounts the widget.

Point at a production CDN by setting `VITE_LAYERSWAP_REMOTE_ENTRY`.

## What's in the host bundle

Only `@layerswap/widget-react` (a few KB plus `@module-federation/runtime`). React,
react-dom, wagmi, viem, react-query, and zustand stay as the host's own
copies (declared peer-deps on `@layerswap/widget-react`) and are fed into the MF
shared scope so the remote uses those exact instances.

## Known follow-ups (not blockers)

- The widget's `index.css` references `/cnbs1.png` as a host-served asset.
  We ship a copy of that file in `public/` so the example works; for
  production the widget CSS should switch to CDN-absolute or
  `import.meta.url`-relative refs.
- Signed manifest verification (per the design doc §11) is not implemented
  yet — this example just loads `remoteEntry.js` directly. Add signing
  before pointing real integrators at the public CDN.
