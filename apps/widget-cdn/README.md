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

## Production build

```bash
LAYERSWAP_PRIVATE_KEY_PEM=/path/to/signing-key.pem pnpm build
```

Emits to `dist/v1/` — content-hashed chunks, stable `remoteEntry.js`,
plus `manifest.json` signed with the provided key. Without
`LAYERSWAP_PRIVATE_KEY_PEM`, the manifest is emitted unsigned — fine for
local builds but rejected by integrators using `verify: true`.

`LAYERSWAP_CHANNEL` (default `v1`) controls the output subdirectory.
Set to a pinned version like `v1.3.0` for an immutable build alongside
the rolling `/v1/`.

## CI deploy (production)

Production deploys go through `.github/workflows/widget-cdn-deploy.yml`.
Vercel's git-integrated auto-deploy is **disabled** for this project
(`git.deploymentEnabled.main: false`) so signing is unbypassable.

### Required GitHub secrets

| Secret | Value |
|---|---|
| `LAYERSWAP_PRIVATE_KEY_PEM` | ECDSA P-256 private key in PEM format. Whose **public** key half is baked into `@layerswap/widget-react/src/manifest.ts`. |
| `VERCEL_TOKEN` | Vercel API token with deploy rights on the project. |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after running `vercel link`. |
| `VERCEL_PROJECT_ID` | Same source as `VERCEL_ORG_ID`. |

### First-time setup

1. **Generate the keypair** (one-time, outside CI):
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out manifest-private.pem
   openssl ec -in manifest-private.pem -pubout -outform DER \
     | base64 | tr -d '\n'
   ```
   The base64 SPKI from the second command goes into
   `packages/widget-react/src/manifest.ts` as
   `PLACEHOLDER_PUBLIC_KEY_SPKI_B64` (replace the placeholder; rename
   the constant to `PUBLIC_KEY_SPKI_B64` once it's the real key).
2. **Publish a fresh `@layerswap/widget-react`** version so integrators
   pin the new public key.
3. **Add the private PEM to GitHub Secrets** as
   `LAYERSWAP_PRIVATE_KEY_PEM` (paste the file contents verbatim,
   including the `-----BEGIN/END EC PRIVATE KEY-----` lines).
4. **Link the Vercel project** (`vercel link` from `apps/widget-cdn/`)
   and copy the resulting org/project IDs into GitHub Secrets.
5. **Disable Vercel git auto-deploy** in the Vercel dashboard for this
   project — the `vercel.json` already declares `deploymentEnabled.main:
   false` but the dashboard toggle is the actual gate.

The next push to `main` touching `apps/widget-cdn` (or any of the
workspace packages it depends on) triggers the workflow. The workflow:

1. Stages the PEM to a tempfile on the runner.
2. Builds + signs locally (the build script reads the tempfile path).
3. Verifies the resulting `manifest.json` against the bundled public
   key — fails the deploy if the key in CI doesn't match.
4. Packs via `vercel build` and deploys via `vercel deploy --prebuilt`
   so Vercel never re-runs the build (and therefore never needs the
   signing key itself).
5. Wipes the tempfile.
6. Smoke-tests the deployed `manifest.json`: reachable, CORS set,
   signed, kill-switch off.

### Manual deploy

`workflow_dispatch` accepts a `channel` input (default `v1`) so you can
publish pinned immutable builds:

```
Actions → widget-cdn — build, sign, deploy → Run workflow
  channel: v1.3.0
```

### Upgrading from PEM-in-secret to true KMS

The current workflow trusts GitHub Secrets to hold the private key. The
secure upgrade is to keep the key non-extractable inside AWS KMS /
Google Cloud KMS / HashiCorp Vault and have the build call the KMS
sign API instead. The workflow already requests `id-token: write` so
OIDC federation works without static credentials.

Migration shape (not implemented — leave it to your platform team's
preference):

1. Generate a P-256 signing key in KMS, mark non-extractable.
2. Export public key SPKI; bake it into `widget-react` (same as today).
3. Rewrite `scripts/build-manifest.mjs` so that when
   `LAYERSWAP_KMS_KEY_ARN` (or equivalent) is set, it calls KMS to sign
   the canonical body instead of using the local PEM. Keep PEM-based
   signing as a fallback for local dev.
4. In the workflow, exchange OIDC token for cloud creds before calling
   the build step; drop `LAYERSWAP_PRIVATE_KEY_PEM` from secrets.

The loader (`@layerswap/widget-react`) does not change — it only sees
the bytes, never the key.

### Rotation

The public key constant in `@layerswap/widget-react` is the trust
anchor. To rotate:

1. Generate the new keypair.
2. Update `PUBLIC_KEY_SPKI_B64` in `packages/widget-react/src/manifest.ts`.
3. Publish a new `@layerswap/widget-react` minor (or major) version.
4. Update `LAYERSWAP_PRIVATE_KEY_PEM` in GitHub Secrets to the new key.
5. Trigger a deploy.

Integrators upgrade by bumping the `@layerswap/widget-react` dep. SRI
pinning that package is recommended.
