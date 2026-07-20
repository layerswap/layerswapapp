# @layerswap/widget-cdn

Rspack Module-Federation **remote** that exposes `@layerswap/widget` for
runtime delivery, plus the Cloudflare **Worker + R2** edge that serves it.

- `name`: `layerswap_widget`
- `filename`: `remoteEntry.js`
- `exposes`: `./Widget`, `./mount`
- Shared singletons: `react`, `react-dom`, `wagmi`, `viem`,
  `@tanstack/react-query`, `zustand`

Consumed by `@layerswap/widget-react` (React hosts) and
`@layerswap/widget-js` (framework-agnostic hosts).

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

Integrators choose their risk posture by which URL they load:

| URL | Behavior |
|---|---|
| `…/v1/manifest.json` | **Rolling** — Worker 302-redirects to the current `v1` build. Auto-updates within ~60s of a channel flip. |
| `…/1.5.0-abc123def456/manifest.json` | **Pinned** — frozen forever at that exact build. |

The loader follows the redirect and resolves the relative `remoteEntry` against
the **final** URL, so the remote anchors at the immutable build path. The
remote loads its content-hashed chunks from the stable `/assets/` namespace,
and the signed manifest registers SRI for both locations. **Rollback /
roll-forward is a pointer flip** — no rebuild, no re-upload (see
`scripts/rollback-r2.mjs`).

A build's immutable identity is its **buildId** — the `@layerswap/widget`
version plus the git sha (`1.5.0-abc123def456`, see `scripts/build-id.mjs`) —
because the deployed bytes also change with widget-cdn/wallets/widget-js/
widget-react, none of which bump the widget version. The **version** remains
the host-facing compatibility number. A breaking change to
the embed/mount API or a required host singleton major (react/wagmi/viem) is
what warrants cutting a new major channel (`v2`); anything backward-compatible
ships within the existing channel.

## Dev

```bash
pnpm dev
```

Serves the remote on `http://127.0.0.1:3100/remoteEntry.js`, plus an unsigned
`http://127.0.0.1:3100/manifest.json` pointing at it — so the loader's manifest
path works in dev exactly as in prod. Load it with `verify: false` (the dev
manifest is unsigned). Dev output stays flat in `dist/` (no version directory,
no redirect).

## Production build

```bash
LAYERSWAP_PRIVATE_KEY_PEM=/path/to/signing-key.pem pnpm build
```

Emits stable `remoteEntry.js` and the signed manifest to `dist/<buildId>/`
(e.g. `dist/1.5.0-abc123def456/`), with content-hashed chunks in
`dist/assets/`. The manifest carries `version`, `channel`, `buildId`, `gitSha`,
`builtAt`, the shared `assetBase`, per-chunk SHA-384 SRI hashes, the kill
switch, and the signature. Without
`LAYERSWAP_PRIVATE_KEY_PEM` the manifest is emitted unsigned — fine for local
builds, rejected by the deploy script and by integrators using `verify: true`.

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
pnpm deploy:r2                  # upload build controls + shared assets, then flip channel
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
signing key never leaves CI. The workflow: builds + signs → verifies the
signature against the bundled public key → uploads the immutable build to R2 →
flips the channel pointer → smoke-tests the live channel. The Worker is
deployed separately (manually, or via the `deploy_worker` dispatch input — it
rarely changes).

#### Required GitHub secrets

| Secret | Value |
|---|---|
| `LAYERSWAP_PRIVATE_KEY_PEM` | ECDSA P-256 private key (PEM). Its public half is baked into `@layerswap/widget-js/src/manifest.ts`. |
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
   Put the base64 SPKI into `packages/widget-js/src/manifest.ts`
   (`MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64`) and `.keys/manifest-public.b64.txt`,
   and the private PEM into the `LAYERSWAP_PRIVATE_KEY_PEM` secret.

### Key rotation

The public key constant in `@layerswap/widget-js` is the trust anchor. Rotate:

1. Generate a new keypair.
2. Update `MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64` in
   `packages/widget-js/src/manifest.ts` (+ `.keys/manifest-public.b64.txt`).
3. Publish a new `@layerswap/widget-js` (and `-react`) version so integrators
   pin the new key.
4. Update `LAYERSWAP_PRIVATE_KEY_PEM` in GitHub Secrets; redeploy.

### Upgrading to KMS

The current workflow trusts a GitHub Secret to hold the private key. The secure
upgrade keeps the key non-extractable in a KMS/HSM and signs via its API. The
workflow already requests `id-token: write` for OIDC federation. The loader
never changes — it only sees signed bytes, never the key.
