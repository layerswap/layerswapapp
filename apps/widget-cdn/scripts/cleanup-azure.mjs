#!/usr/bin/env node
// Reference-aware cleanup of old widget builds in Azure Blob Storage.
//
//   node scripts/cleanup-azure.mjs                          # dry run (report only)
//   node scripts/cleanup-azure.mjs --plan-out plan.json     # dry run + reviewable plan file
//   node scripts/cleanup-azure.mjs --apply                  # delete everything deletable
//   node scripts/cleanup-azure.mjs --apply --plan-in plan.json   # delete only the approved plan
//   node scripts/cleanup-azure.mjs --keep-recent 5 --asset-grace-days 2 --build-grace-days 2
//
// Retention rules live in cleanup-lib.mjs. Requires `az login` (or the CI
// OIDC login) and AZURE_STORAGE_ACCOUNT / AZURE_STORAGE_CONTAINER.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  deleteObject,
  listObjects,
  makeClient,
  readJsonObject,
} from "./azure-lib.mjs";
import { isValidBuildId } from "./build-id.mjs";
import { runCleanupCli } from "./cleanup-lib.mjs";

const CHANNEL_MANIFEST_RE = /^v\d+\/manifest\.json$/;

// Azure has no channels.json — each rolling pointer is the signed manifest
// copied to /<channel>/manifest.json. Its buildId IS the pointer.
export async function readAzureChannelPointers(
  ctx,
  { list = listObjects, readJson = readJsonObject } = {},
) {
  const pointers = {};
  for (const { key } of await list(ctx, { prefix: "v" })) {
    if (!CHANNEL_MANIFEST_RE.test(key)) continue;
    const manifest = await readJson(ctx, key);
    if (manifest && isValidBuildId(manifest.buildId)) {
      pointers[key.split("/")[0]] = manifest.buildId;
    }
  }
  return pointers;
}

export const azureCleanupOps = {
  listObjects,
  readJson: readJsonObject,
  readChannelPointers: readAzureChannelPointers,
  deleteObject,
};

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entryUrl === import.meta.url) {
  try {
    await runCleanupCli({
      argv: process.argv.slice(2),
      ctx: makeClient(),
      ops: azureCleanupOps,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
