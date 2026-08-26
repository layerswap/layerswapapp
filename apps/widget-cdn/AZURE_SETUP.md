# Azure Blob Storage sandbox setup

This is the low-cost personal-account setup for validating widget delivery
before Layerswap provisions Azure Front Door and a private production origin.
It uses a dedicated public Blob container because browsers must fetch the
manifest and JavaScript anonymously.

Do not reuse this account for unrelated private data.

## 1. Create the storage account

In the [Azure portal](https://portal.azure.com):

1. Open **Storage accounts** and select **Create**.
2. Create or choose a resource group, for example
   `widget-cdn-sandbox-rg`.
3. Enter a globally unique lowercase account name, for example
   `yournamewidgetcdn`.
4. Choose:
   - Preferred storage type: **Blob storage or Azure Data Lake Storage**.
   - Region: a nearby region.
   - Performance: **Standard**.
   - Redundancy: **LRS** for this temporary sandbox.
5. On **Advanced**:
   - Require secure transfer: **Enabled**.
   - Allow enabling anonymous access on individual containers: **Enabled**.
   - Enable storage account key access: **Disabled**.
   - Default to Microsoft Entra authorization in the Azure portal: **Enabled**.
   - Minimum TLS version: **1.2**.
   - Hierarchical namespace: **Disabled**.
6. On **Networking**, allow public network access from all networks for the
   sandbox.
7. Select **Review + create**, then **Create**.

## 2. Protect accidental overwrites

Open the storage account, then **Data management → Data protection**:

- Enable blob soft delete with a 7-day retention period.
- Enable container soft delete with a 7-day retention period.
- Enable blob versioning.

The only routinely overwritten blob is `v1/manifest.json`. Versioning gives
the sandbox a recovery history for channel promotions.

## 3. Grant your user deployment access

Being the subscription owner does not always grant Blob data access.

1. Open **Access control (IAM)** on the storage account.
2. Select **Add → Add role assignment**.
3. Choose **Storage Blob Data Contributor**.
4. Assign access to **User, group, or service principal**.
5. Select your personal Azure user and save.

The role can take several minutes to propagate. Wait for it before continuing
because the portal is configured to use Microsoft Entra authorization instead
of the storage account key.

## 4. Create the public container

1. Open **Data storage → Containers**.
2. Select **+ Container**.
3. Name it `widget-cdn`.
4. Set anonymous access to **Blob (anonymous read access for blobs only)**.
   Do not choose container-level listing access.
5. Select **Create**.

If the anonymous-access option is disabled, open
**Settings → Configuration**, enable **Allow Blob anonymous access**, save,
and retry.

The public base URL will be:

```text
https://<account>.blob.core.windows.net/widget-cdn
```

## 5. Configure browser CORS

Open **Settings → Resource sharing (CORS)**. In the **Blob service** row add:

| Field           | Value                                            |
| --------------- | ------------------------------------------------ |
| Allowed origins | `*`                                              |
| Allowed methods | `GET`, `HEAD`, `OPTIONS`                         |
| Allowed headers | `*`                                              |
| Exposed headers | `ETag,Content-Length,Content-Type,Cache-Control` |
| Max age         | `86400`                                          |

Save the rule. This is required for the cross-origin manifest fetch and
`crossorigin="anonymous"` JavaScript loads.

## 6. Authenticate locally

Install Azure CLI on macOS if `az` is not already available:

```bash
brew install azure-cli
az login
az account set --subscription "<your subscription id or name>"
az account show --output table
```

The deploy script asks Azure CLI for a short-lived Microsoft Entra access
token. It does not use a storage account key or connection string.

## 7. Build a sandbox artifact

Create a temporary signing key. It is ignored by git and is intentionally not
the production trust key:

```bash
openssl ecparam -name prime256v1 -genkey -noout \
  -out apps/widget-cdn/.keys/azure-test-private.pem

LAYERSWAP_PRIVATE_KEY_PEM=.keys/azure-test-private.pem \
  pnpm --filter @layerswap/widget-cdn build
```

The sandbox key will not verify against the public key compiled into the
production loader. Use verification-off only in the internal example harness.

## 8. Deploy and promote `v1`

```bash
AZURE_STORAGE_ACCOUNT="<account>" \
AZURE_STORAGE_CONTAINER="widget-cdn" \
pnpm --filter @layerswap/widget-cdn deploy:azure
```

The command uploads immutable objects first, publishes the immutable manifest
last, then copies the signed manifest to `v1/manifest.json`. The channel blob
is written with `Cache-Control: no-store, max-age=0`; immutable build files and
shared assets retain their one-year immutable cache policy. If Front Door or
another CDN is later added, configure the manifest route to honor the origin
header or disable caching for `*/manifest.json`.

Upload without changing `v1`:

```bash
LAYERSWAP_PROMOTE=false \
AZURE_STORAGE_ACCOUNT="<account>" \
AZURE_STORAGE_CONTAINER="widget-cdn" \
pnpm --filter @layerswap/widget-cdn deploy:azure
```

Rollback/promotion to an already-uploaded build:

```bash
AZURE_STORAGE_ACCOUNT="<account>" \
AZURE_STORAGE_CONTAINER="widget-cdn" \
pnpm --filter @layerswap/widget-cdn rollback:azure -- \
  v1 1.7.0-<build-id>
```

## 9. Smoke-test Blob delivery

```bash
export WIDGET_AZURE_BASE="https://<account>.blob.core.windows.net/widget-cdn"

curl -fsSL -H "Origin: http://127.0.0.1:3001" \
  -D /tmp/widget-azure-headers \
  "$WIDGET_AZURE_BASE/v1/manifest.json" \
  -o /tmp/widget-azure-manifest.json

grep -i "access-control-allow-origin" /tmp/widget-azure-headers
node -e "
  const m = require('/tmp/widget-azure-manifest.json');
  console.log({
    buildId: m.buildId,
    remoteEntry: new URL(m.remoteEntry, process.env.WIDGET_AZURE_BASE + '/v1/manifest.json').href
  });
"
```

The published React/JS loaders cannot be repointed at this sandbox: their
manifest URL and signature verification policy are fixed inside
`@layerswap/widget-js`. Browser integration testing requires a loader build
whose internal `WIDGET_MANIFEST_URL` and trust anchor target the sandbox; do not add
host environment variables or globals to bypass that boundary.

## 10. GitHub Actions environments

After local delivery works, `.github/workflows/widget-cdn-deploy.yml` deploys
merges to `dev` to the personal account through OIDC. Its automatic target is
the `widget-cdn-azure-sandbox` GitHub environment; the sandbox identifiers are
inline fallbacks, so only the `LAYERSWAP_PRIVATE_KEY_PEM` signing secret is
required alongside the `LAYERSWAP_MANIFEST_PUBLIC_KEY_SPKI_B64` public-key
variable. Production is a manual dispatch from `main` to the
`widget-cdn-production` environment.

In Azure Portal:

1. Open **Microsoft Entra ID → App registrations → New registration**.
2. Name it `layerswap-widget-cdn-github-test`, use the current tenant only,
   and leave the redirect URI empty.
3. Open **Certificates & secrets → Federated credentials → Add credential**.
4. Select the GitHub Actions scenario and configure:
   - Organization: `layerswap`
   - Repository: `layerswapapp`
   - Entity type: **Environment**
   - Environment: `widget-cdn-azure-sandbox`
5. Assign this application **Storage Blob Data Contributor** on only the
   `widget-cdn` container.
6. Create a separate production identity and environment-based federated
   credential for `widget-cdn-production`, scoped only to the production
   container.

In GitHub, a repository administrator must then:

1. Open **Settings → Environments** and create
   `widget-cdn-azure-sandbox`.
2. Add one or more **Required reviewers** under deployment protection rules.
   Enable **Prevent self-review** when the person who starts a deployment must
   not approve it.
3. Add `LAYERSWAP_PRIVATE_KEY_PEM` as an environment secret and add the Azure
   identifiers described in the [CI deploy configuration](./README.md#ci-deploy)
   plus `LAYERSWAP_MANIFEST_PUBLIC_KEY_SPKI_B64` as environment variables.
4. Repeat for `widget-cdn-production`, using the production approvers,
   identity, storage account, and signing key.

Do not place the signing key or Azure deployment configuration at repository
scope. Environment-scoped values remain unavailable to the deploy job until a
required reviewer approves it.

Because each privileged job declares a GitHub Environment, Azure accepts its
OIDC token only when the corresponding subject is exactly:

```text
repo:layerswap/layerswapapp:environment:widget-cdn-azure-sandbox
repo:layerswap/layerswapapp:environment:widget-cdn-production
```

The Azure client, tenant, subscription, storage account, and container
identifiers in the sandbox workflow are not credentials. The workflow builds
and tests an unsigned candidate first; only the approved environment job can
access its signing key or request the Azure OIDC token.

## Production follow-up

The Layerswap account should replace this public sandbox origin with Azure
Front Door and preferably a private Blob origin. The final rollout also needs:

- The production manifest signing key/KMS.
- A stable custom domain such as `cdn.layerswap.io`.
