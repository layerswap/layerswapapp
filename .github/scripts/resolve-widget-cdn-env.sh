#!/usr/bin/env bash
# Resolve the widget-cdn Azure target for a GitHub environment.
#
# Inputs (env):
#   DEPLOY_TARGET            GitHub environment name (required)
#   RAW_AZURE_CLIENT_ID      \
#   RAW_AZURE_TENANT_ID       |  the environment's `vars.*`, passed through by
#   RAW_AZURE_SUBSCRIPTION_ID |  the workflow (may be empty)
#   RAW_AZURE_STORAGE_ACCOUNT |
#   RAW_AZURE_STORAGE_CONTAINER
#   RAW_CDN_BASE_URL         /
#
# For widget-cdn-azure-sandbox, missing values fall back to the personal
# sandbox identifiers (they are identifiers, not credentials) so the sandbox
# works before its environment variables exist. Any other environment must be
# fully configured in Settings → Environments, or this fails with a clear
# error. Resolved values are appended to $GITHUB_ENV.
set -euo pipefail

TARGET="${DEPLOY_TARGET:?DEPLOY_TARGET is required}"
CLIENT_ID="${RAW_AZURE_CLIENT_ID:-}"
TENANT_ID="${RAW_AZURE_TENANT_ID:-}"
SUBSCRIPTION_ID="${RAW_AZURE_SUBSCRIPTION_ID:-}"
STORAGE_ACCOUNT="${RAW_AZURE_STORAGE_ACCOUNT:-}"
CONTAINER="${RAW_AZURE_STORAGE_CONTAINER:-}"
BASE_URL="${RAW_CDN_BASE_URL:-}"

if [ "$TARGET" = "widget-cdn-azure-sandbox" ]; then
  CLIENT_ID="${CLIENT_ID:-69ca1ebc-8381-4b6d-864a-497053bdd827}"
  TENANT_ID="${TENANT_ID:-8e8e42bf-64ee-4057-99ab-8288126d4ebb}"
  SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-f60908b5-2c18-438c-89c5-510a01d2a802}"
  STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-layerswapcdntest}"
else
  MISSING=""
  [ -z "$CLIENT_ID" ] && MISSING="$MISSING AZURE_CLIENT_ID"
  [ -z "$TENANT_ID" ] && MISSING="$MISSING AZURE_TENANT_ID"
  [ -z "$SUBSCRIPTION_ID" ] && MISSING="$MISSING AZURE_SUBSCRIPTION_ID"
  [ -z "$STORAGE_ACCOUNT" ] && MISSING="$MISSING AZURE_STORAGE_ACCOUNT"
  if [ -n "$MISSING" ]; then
    echo "::error::Environment '$TARGET' is missing variables:$MISSING — configure them in Settings → Environments."
    exit 1
  fi
fi

CONTAINER="${CONTAINER:-widget-cdn}"
BASE_URL="${BASE_URL:-https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}}"

{
  echo "AZURE_CLIENT_ID=$CLIENT_ID"
  echo "AZURE_TENANT_ID=$TENANT_ID"
  echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
  echo "AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT"
  echo "AZURE_STORAGE_CONTAINER=$CONTAINER"
  echo "CDN_BASE_URL=${BASE_URL%/}"
} >> "$GITHUB_ENV"

echo "Resolved target $TARGET (account: $STORAGE_ACCOUNT, container: $CONTAINER)"
