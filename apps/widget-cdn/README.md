# @layerswap/widget-cdn

Rspack Module-Federation **remote** that exposes `@layerswap/widget` for
runtime delivery from **Azure Blob Storage**.

- `name`: `layerswap_widget`
- `filename`: `remoteEntry.js`
- `exposes`: `./Widget`, `./mount` (swap widget), `./DepositWidget`,
  `./mountDeposit` (deposit widget — fixed-destination funding flow)
- Shared singletons: `react`, `react-dom`, `wagmi`, `viem`,
  `@tanstack/react-query`, `zustand`

Consumed by `@layerswap/widget-react` (React hosts) and
`@layerswap/widget-js` (framework-agnostic hosts).

See [AZURE_SETUP.md](./AZURE_SETUP.md) for the storage-account setup and the
production follow-up checklist.

## Versioning model

Every build is published to an **immutable, buildId-named prefix** and never
overwritten. Each rolling major channel is a single mutable blob — the signed
manifest copied to `/<channel>/manifest.json`:

```
Blob container (widget-cdn)
├── 1.5.0-abc123def456/    ← immutable build, write-once
│   ├── manifest.json      ← signed; describes this exact build
│   └── remoteEntry.js
├── 1.5.0-fedcba654321/    ← next build, also immutable
├── assets/                 ← shared content-addressed namespace
│   └── <name>.<hash>.js   ← byte-identical chunks reuse one URL/object
└── v1/manifest.json       ← the ONLY mutable object: the rolling channel
                             pointer (a copy of the promoted build's manifest)
```

| URL | Behavior |
|---|---|
| `…/v1/manifest.json` | **Rolling** — `Cache-Control: no-store`, so new page loads observe a promotion immediately. |
| `…/1.5.0-abc123def456/manifest.json` | **Immutable** — exact build used for staging, rollback, and debugging. Its signed validity window still expires. |

Integrators don't choose between them: the manifest URL is not a public knob.
`@layerswap/widget-js` bakes in the rolling channel URL
(`WIDGET_MANIFEST_URL` in `src/manifest.ts`) and `resolveSource()` takes no
arguments, so every integrator rides the channel and picks up pointer flips
automatically. Immutable URLs exist for Layerswap's own release mechanics
(staged releases, rollback targets, and debugging a specific build); hosts
cannot point the loader at them.

The manifest uses a build-addressed relative `remoteEntry` (for example
`../1.5.0-abc123def456/remoteEntry.js`), so it resolves to the same immutable
build path whether it is fetched from the immutable location or from the
rolling channel blob. The remote loads its content-hashed chunks from the
stable `/assets/` namespace, and the signed manifest registers SRI for both
locations. **Rollback / roll-forward is a pointer copy of an already-signed
manifest** — no rebuild, no re-upload (see `scripts/rollback-azure.mjs`).

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

Dev output stays flat in `dist/` (no version directory).

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

## Deploy

Requires `az login` (or CI OIDC) plus `AZURE_STORAGE_ACCOUNT` /
`AZURE_STORAGE_CONTAINER` — see `scripts/azure-lib.mjs`. No account key or
connection string is used.

```bash
pnpm deploy:azure                  # local default: upload and promote
LAYERSWAP_PROMOTE=false pnpm deploy:azure   # upload only (staged release)
ALLOW_OVERWRITE=1 pnpm deploy:azure         # re-upload an existing build (escape hatch)

# roll a channel to any already-published build (instant; no rebuild):
node scripts/rollback-azure.mjs v1 1.4.0-abc123def456
```

`deploy:azure` refuses to overwrite an already-published buildId — published
builds are immutable. It reuses content-hashed objects already present under
`/assets/`, so unchanged chunks keep their browser cache and do not consume
duplicate storage. The buildId embeds the commit sha, so deploying from any
new commit gets a fresh control-file prefix.

### CI deploy

Deploys go through `.github/workflows/widget-cdn-deploy.yml` as two jobs. The
`build` job tests the release and uploads an unsigned release candidate. The
`deploy` job waits for approval of the target **GitHub environment**, then
signs that candidate (the key never leaves CI), verifies it, uploads it,
promotes the channel, and smoke-tests the public endpoint:

- **`widget-cdn-azure-sandbox`** — the personal-account sandbox. A push
  deploys here; its Azure identifiers are hardcoded fallbacks in
  `.github/scripts/resolve-widget-cdn-env.sh`, so it works before the
  environment has any variables configured.
- **`widget-cdn-production`** — drop-in: selectable via `workflow_dispatch`
  today, fails with a clear "missing variables" error until a repo admin
  creates the production Azure identity/storage account and fills in the
  environment. Production dispatches are refused from non-default branches.

Each environment carries its Azure identity as environment **variables**
(`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`,
`AZURE_STORAGE_ACCOUNT`, optional `AZURE_STORAGE_CONTAINER` and
`CDN_BASE_URL` for a custom domain) and its **own** signing keypair as the
environment **secret** `LAYERSWAP_PRIVATE_KEY_PEM` — the production key must
never exist at repo level.

Approval protection is required configuration; workflow YAML can reference an
environment but cannot define its reviewers. A repo admin must configure both
deployment environments in **Settings → Environments**:

1. Open `widget-cdn-azure-sandbox`, add one or more **Required reviewers**, and
   enable **Prevent self-review** if the deploy initiator must not approve it.
2. Repeat for `widget-cdn-production` with the production approver group.
3. Keep the Azure variables and `LAYERSWAP_PRIVATE_KEY_PEM` scoped to the
   environment, not the repository. This ensures they are unavailable until
   the approval is granted.

With those protection rules enabled, every CDN deploy pauses at the `deploy`
job with "Review deployments". The job cannot sign a manifest, request an
Azure OIDC token, or write to Blob Storage before approval. Cleanup `apply`
jobs use the same gate.

### Blob cache and retention policy

Promotion overwrites only `/<channel>/manifest.json`. It is published with
`Cache-Control: no-store, max-age=0` so new page loads observe a pointer
change without a CDN purge. Immutable build controls and content-addressed
assets remain `public, max-age=31536000, immutable`.

If Azure Front Door or another CDN sits in front of Blob Storage, its route
for `*/manifest.json` must honor the origin header or have caching disabled.
Build and asset routes should keep long-lived caching.

### Cleanup of old builds

Do not apply an age-only delete policy to `/assets/`: chunks are shared between
builds. Reference-aware cleanup lives in `scripts/cleanup-azure.mjs` (policy in
`scripts/cleanup-lib.mjs`):

```bash
pnpm cleanup:azure                         # dry run — report only
pnpm cleanup:azure --plan-out plan.json    # dry run + reviewable plan file
pnpm cleanup:azure --apply                 # delete everything deletable
pnpm cleanup:azure --apply --plan-in plan.json   # delete only the approved plan
pnpm cleanup:azure --keep-recent 5 --asset-grace-days 2 --build-grace-days 2
```

A build prefix is **retained** when it is the current target of any rolling
channel, its manifest is not yet expired (unexpired builds are valid rollback
targets and in-flight sessions may still lazy-load their chunks), it is one of
the `--keep-recent` most recent builds of its channel, or it has no manifest
but was uploaded within `--build-grace-days` (an in-flight deploy publishes
its manifest last). Everything else is deleted — manifest first, so an
interrupted deletion can never leave a promotable half-build. Shared assets
are then mark-and-swept: chunks referenced by any retained manifest survive;
unreferenced ones are deleted after `--asset-grace-days`. Channel pointers and
unrecognized keys are never touched, anomalies are kept and warned about, and
apply aborts if a channel pointer changes between planning and deletion.

The cleanup run also warns when a promoted build's manifest is expired or
expires within 7 days — the early signal that the live channel is about to
fail closed.

CI runs (`.github/workflows/widget-cdn-cleanup.yml`) are **plan → approve →
apply**: a `plan` job posts the keep/delete report to the run summary and
saves it with `--plan-out`; the `apply` job waits on the
`widget-cdn-azure-sandbox` environment approval ("Review deployments") and
then deletes exactly the reviewed plan via `--apply --plan-in` — recomputed
against fresh state, so anything promoted or uploaded since planning stays
protected, and items that became deletable after approval wait for the next
plan. When nothing is deletable, apply is skipped and no approval is
requested. **Approvals only exist once a repo admin adds required reviewers**
in Settings → Environments → `widget-cdn-azure-sandbox`.

#### Required GitHub configuration (per environment)

| Kind | Name | Value |
|---|---|---|
| secret | `LAYERSWAP_PRIVATE_KEY_PEM` | ECDSA P-256 private key (PEM), one keypair per environment. The production public half is baked into `packages/widget/js/src/manifest.ts`. |
| variable | `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` | OIDC-federated identity for `azure/login`. |
| variable | `AZURE_STORAGE_ACCOUNT` | Target storage account. |
| variable | `AZURE_STORAGE_CONTAINER` | Optional; default `widget-cdn`. |
| variable | `CDN_BASE_URL` | Optional; custom domain / Front Door origin for smoke tests. Defaults to the Blob endpoint. |

Each environment must also have a **Required reviewers** deployment protection
rule. This rule is what enforces approval; creating an unprotected environment
with the same name is not sufficient.

Azure authentication uses OIDC federation (`azure/login`) — no storage keys or
connection strings are stored as secrets.

### First-time infrastructure setup

Follow [AZURE_SETUP.md](./AZURE_SETUP.md) (storage account, container, CORS,
RBAC, OIDC federation). The signing keypair is generated once:

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
upgrade keeps the key non-extractable in a KMS/HSM (e.g. Azure Key Vault) and
signs via its API. The workflow already requests `id-token: write` for OIDC
federation. The loader never changes — it only sees signed bytes, never the
key.
