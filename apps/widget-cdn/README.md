# @layerswap/widget-cdn

Rspack Module-Federation **remote** that exposes `@layerswap/widget` for
runtime delivery, plus the Cloudflare **Worker + R2** edge that serves it.

- `name`: `layerswap_widget`
- `filename`: `remoteEntry.js`
- `exposes`: `./Widget`, `./mount` (swap widget), `./DepositWidget`,
  `./mountDeposit` (deposit widget — fixed-destination funding flow)
- Shared singletons: `react`, `react-dom`, `wagmi`, `viem`,
  `@tanstack/react-query`, `zustand`

Consumed by `@layerswap/widget-react` (React hosts) and
`@layerswap/widget-js` (framework-agnostic hosts).

Azure Blob Storage migration is being developed side-by-side with the current
production R2 path. See [AZURE_SETUP.md](./AZURE_SETUP.md) for the personal
sandbox setup and `deploy:azure` / `rollback:azure` commands.

## Versioning model

Every build is published to an **immutable, buildId-named prefix** in R2 and
never overwritten. A single mutable pointer (`channels.json`) maps each rolling
major channel to its current build, and the Worker turns that into a redirect.

```
R2 bucket (layerswap-widget-cdn)
├── 1.5.0-abc123def456/    ← immutable build, write-once
│   ├── manifest.json      ← signed; describes this exact build
│   └── remoteEntry.js
├── 1.5.0-fedcba654321/    ← next build, also immutable
├── assets/                 ← shared content-addressed namespace
│   └── <name>.<hash>.js   ← byte-identical chunks reuse one URL/object
└── channels.json          ← the ONLY mutable object: { "v1": "1.5.0-abc123def456" }
```

The Worker serves two kinds of URL:

| URL | Behavior |
|---|---|
| `…/v1/manifest.json` | **Rolling** — Worker 302-redirects to the current `v1` build. Auto-updates within ~60s of a channel flip. |
| `…/1.5.0-abc123def456/manifest.json` | **Immutable** — exact build used for staging, rollback, and debugging. Its signed validity window still expires. |

Integrators don't choose between them: the manifest URL is not a public knob.
`@layerswap/widget-js` bakes in the rolling channel URL
(`WIDGET_MANIFEST_URL` in `src/manifest.ts`) and `resolveSource()` takes no
arguments, so every integrator rides the channel and picks up pointer flips
automatically. Immutable URLs exist for Layerswap's own release mechanics
(staged releases, rollback targets, and debugging a specific build); hosts
cannot point the loader at them.

The manifest uses a build-addressed relative `remoteEntry` (for example
`../1.5.0-abc123def456/remoteEntry.js`), so the remote anchors at the immutable
build path whether the manifest arrives through the Worker's redirect or from
an Azure rolling-channel blob. The remote loads its content-hashed chunks from
the stable `/assets/` namespace, and the signed manifest registers SRI for both
locations. **Rollback / roll-forward is a pointer flip** — no rebuild, no
re-upload (see `scripts/rollback-r2.mjs` or `scripts/rollback-azure.mjs`).

A build's immutable identity is its **buildId** — the `@layerswap/widget`
version plus the git sha (`1.5.0-abc123def456`, see `scripts/build-id.mjs`) —
because the deployed bytes also change with widget-cdn/wallets/widget-js/
widget-react, none of which bump the widget version. The manifest's
**protocolMajor** is the host-facing compatibility boundary and selects the
channel independently from the core implementation version. A breaking change
to the manifest, embed/mount API, exposed modules, or a required host runtime is
what warrants protocol `2`, loader package major `2`, and `/v2/`; compatible
changes continue rolling within `/v1/`.

## Dev

```bash
pnpm dev
```

Serves the remote on `http://127.0.0.1:3100/remoteEntry.js`, plus an unsigned
`http://127.0.0.1:3100/manifest.json` pointing at it. The published loader is
intentionally fixed to the signed production channel and cannot load this
unsigned development manifest.

Dev output stays flat in `dist/` (no version directory, no redirect).

## Production build

```bash
LAYERSWAP_PRIVATE_KEY_PEM=/path/to/signing-key.pem pnpm build
```

Emits stable `remoteEntry.js` and the signed manifest to `dist/<buildId>/`
(e.g. `dist/1.5.0-abc123def456/`), with content-hashed chunks in
`dist/assets/`. The manifest carries `version`, `channel`, `buildId`, `gitSha`,
`builtAt`, a validity window (`issuedAt`/`expiresAt` — replay protection;
verifying loaders refuse a manifest that is expired or missing `expiresAt`),
the shared `assetBase`, per-chunk SHA-384 SRI hashes, the kill switch, and the
signature. Without `LAYERSWAP_PRIVATE_KEY_PEM` the manifest is emitted
unsigned — fine for local builds, rejected by the deploy script and by the
loader (integrators always verify).

`LAYERSWAP_RELEASE_VERSION` overrides the version label and
`LAYERSWAP_RELEASE_ID` the buildId (and therefore the output directory) for a
one-off build.

```bash
pnpm verify-manifest   # round-trip the signature against the bundled public key
```

## The edge: Cloudflare Worker + R2

The Worker (`worker/`) serves R2 and does the rolling-channel redirect:

- `GET /vN/<path>` → reads `channels.json`, 302-redirects to `/<buildId>/<path>`
  (short cache so flips propagate fast).
- `GET /<buildId>/<path>` → serves from R2 with `immutable` caching + permissive
  CORS (chunks load `crossorigin="anonymous"` for SRI).
- `GET /assets/<content-hashed-file>` → serves the shared immutable chunk used
  by every build that emitted the same bytes.
- Security headers (HSTS, nosniff, frame-deny) on every response.

```bash
pnpm worker:dev      # local Worker dev
pnpm worker:deploy   # wrangler deploy
```

## Deploy

```bash
pnpm deploy:r2                  # local default: upload and promote
LAYERSWAP_PROMOTE=false pnpm deploy:r2   # upload only (staged release)
ALLOW_OVERWRITE=1 pnpm deploy:r2         # re-upload an existing build (escape hatch)

# roll a channel to any already-published build (instant; no rebuild):
node scripts/rollback-r2.mjs v1 1.4.0-abc123def456
```

`deploy:r2` refuses to overwrite an already-published buildId — published
builds are immutable. It reuses content-hashed objects already present under
`/assets/`, so unchanged chunks keep their browser cache and do not consume
duplicate R2 storage. The buildId embeds the commit sha, so deploying from any
new commit gets a fresh control-file prefix.

### CI deploy (production)

Production deploys go through `.github/workflows/widget-cdn-deploy.yml`. The
signing key never leaves CI. A main push builds, signs, verifies, uploads, and
smoke-tests an immutable candidate without changing a channel. Promote it in a
separate `workflow_dispatch` run by entering the reported `buildId` and its
channel; that job validates the existing target, flips the pointer, and
smoke-tests the live channel. The Worker is deployed separately and rarely
changes.

### Azure Blob cache and retention policy

Azure promotion overwrites only `/<channel>/manifest.json`. It is published
with `Cache-Control: no-store, max-age=0` so new page loads observe a pointer
change without a CDN purge. Immutable build controls and content-addressed
assets remain `public, max-age=31536000, immutable`.

If Azure Front Door or another company CDN sits in front of Blob Storage, its
route for `*/manifest.json` must honor the origin header or have caching
disabled. Build and asset routes should keep long-lived caching.

Do not apply an age-only delete policy to `/assets/`: chunks are shared between
builds. Cleanup must retain every current supported-major build plus rollback
targets, mark the assets referenced by their manifests, and delete only
unreferenced assets after a grace period. Azure lifecycle rules are suitable
for old channel-blob versions and unpromoted candidates; reference-aware build
cleanup should be a separate scheduled job once production retention periods
are chosen.

#### Required GitHub secrets

| Secret | Value |
|---|---|
| `LAYERSWAP_PRIVATE_KEY_PEM` | ECDSA P-256 private key (PEM). Its public half is baked into `packages/widget/js/src/manifest.ts`. |
| `R2_ACCOUNT_ID` | Cloudflare account id. |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 **Account** API token (Object Read & Write) credentials. |
| `CLOUDFLARE_API_TOKEN` | *(optional)* Only if CI deploys the Worker. |

#### Required GitHub variables

| Variable | Value |
|---|---|
| `R2_BUCKET` | Bucket name (default `layerswap-widget-cdn`). |
| `CDN_BASE_URL` | Public CDN origin, e.g. the Worker's `*.workers.dev` URL or custom domain. Used by the smoke test. |

### First-time infrastructure setup

1. **Enable R2** in the Cloudflare dashboard (Storage & databases → R2).
2. **Create the bucket**: `wrangler r2 bucket create layerswap-widget-cdn`.
3. **Deploy the Worker**: `pnpm worker:deploy` (registers a `*.workers.dev`
   subdomain on first run, or wire a custom domain in `worker/wrangler.toml`).
4. **Create an R2 Account API token** (Object Read & Write) → set
   `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ACCOUNT_ID`.
5. **Generate the signing keypair** (one-time):
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out .keys/manifest-private.pem
   openssl ec -in .keys/manifest-private.pem -pubout -outform DER | base64 | tr -d '\n'
   ```
   Put the base64 SPKI into `packages/widget/js/src/manifest.ts`
   (`MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64`) and `.keys/manifest-public.b64.txt`,
   and the private PEM into the `LAYERSWAP_PRIVATE_KEY_PEM` secret.

### Key rotation

The public key constant in `@layerswap/widget-js` is the trust anchor. Rotate:

1. Generate a new keypair.
2. Update `MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64` in
   `packages/widget/js/src/manifest.ts` (+ `.keys/manifest-public.b64.txt`).
3. Publish a new `@layerswap/widget-js` (and `-react`) version so integrators
   pin the new key.
4. Update `LAYERSWAP_PRIVATE_KEY_PEM` in GitHub Secrets; redeploy.

### Upgrading to KMS

The current workflow trusts a GitHub Secret to hold the private key. The secure
upgrade keeps the key non-extractable in a KMS/HSM and signs via its API. The
workflow already requests `id-token: write` for OIDC federation. The loader
never changes — it only sees signed bytes, never the key.
