#!/usr/bin/env node
// Publish a signed build to Azure Blob Storage.
//
// Immutable build controls live at /<buildId>/ and content-hashed chunks live
// in /assets/. Promotion atomically copies the same signed manifest to
// /<channel>/manifest.json; its build-addressed remoteEntry keeps all code on
// immutable URLs without needing any edge redirect service.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  contentTypeFor,
  makeClient,
  objectExists,
  putObject,
  readJsonObject,
  writeChannelManifest,
} from "./azure-lib.mjs";
import { resolveBuildIdentity } from "./build-id.mjs";
import { WIDGET_PROTOCOL_MAJOR } from "@layerswap/widget-types";
import {
  ASSET_BASE,
  ASSET_DIRECTORY,
  deploymentKey,
  isSharedAsset,
  remoteEntryForBuild,
} from "./cdn-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

export function validateAzureManifest(manifest, identity) {
  const mismatches = [
    ["buildId", manifest.buildId, identity.buildId],
    ["protocolMajor", manifest.protocolMajor, WIDGET_PROTOCOL_MAJOR],
    ["version", manifest.version, identity.version],
    ["channel", manifest.channel, identity.channel],
    ["gitSha", manifest.gitSha, identity.gitSha],
    ["assetBase", manifest.assetBase, ASSET_BASE],
    [
      "remoteEntry",
      manifest.remoteEntry,
      remoteEntryForBuild(identity.buildId),
    ],
  ].filter(([, actual, expected]) => actual !== expected);

  if (mismatches.length > 0) {
    const details = mismatches
      .map(
        ([field, actual, expected]) =>
          `${field}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`,
      )
      .join(", ");
    throw new Error(
      `[deploy-azure] manifest identity does not match this build: ${details}`,
    );
  }
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function runWithConcurrency(items, limit, task) {
  if (items.length === 0) return;
  const workerCount = Math.min(Math.max(1, Math.floor(limit)), items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await task(item);
      }
    }),
  );
}

export async function deployAzureBuild(options = {}) {
  const root = options.root ?? ROOT;
  const identity = options.identity ?? resolveBuildIdentity(root);
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const createClient = options.createClient ?? (() => makeClient(env));
  const exists = options.objectExists ?? objectExists;
  const upload = options.putObject ?? putObject;
  const readJson = options.readJsonObject ?? readJsonObject;
  const publishChannel = options.writeChannelManifest ?? writeChannelManifest;
  const uploadConcurrency = options.uploadConcurrency ?? 8;
  const dist = join(root, "dist", identity.buildId);
  const assetDist = join(root, "dist", ASSET_DIRECTORY);
  const manifestPath = join(dist, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error(
      `[deploy-azure] missing ${manifestPath} — run \`pnpm build\` first.`,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(
      `[deploy-azure] failed to read manifest: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!manifest.signature) {
    throw new Error(
      "[deploy-azure] refusing to deploy an UNSIGNED manifest. " +
        "Build with LAYERSWAP_PRIVATE_KEY_PEM set.",
    );
  }

  // Validate before Azure credentials are read or a client is created.
  validateAzureManifest(manifest, identity);
  if (!existsSync(assetDist)) {
    throw new Error(
      `[deploy-azure] missing shared asset output ${assetDist} — run \`pnpm build\` first.`,
    );
  }

  const ctx = createClient();
  if (await exists(ctx, `${identity.buildId}/manifest.json`)) {
    if (env.ALLOW_OVERWRITE !== "1") {
      throw new Error(
        `[deploy-azure] build ${identity.buildId} is already published (immutable). ` +
          "Deploy from a new commit, or set ALLOW_OVERWRITE=1 to force.",
      );
    }
  }

  const files = [
    ...listFiles(dist).map((file) => ({ file, root: dist, shared: false })),
    ...listFiles(assetDist).map((file) => ({
      file,
      root: assetDist,
      shared: true,
    })),
  ].sort((a, b) => a.file.localeCompare(b.file));

  const publishableFiles = files.map(({ file, root: fileRoot, shared }) => {
    const rel = relative(fileRoot, file).split(/[\\/]/).join("/");
    if (shared && !isSharedAsset(rel)) {
      throw new Error(
        `[deploy-azure] refusing non-content-hashed file in ${ASSET_DIRECTORY}/: ${rel}`,
      );
    }
    return {
      file,
      rel,
      shared,
      key: shared
        ? deploymentKey(identity.buildId, rel)
        : `${identity.buildId}/${rel}`,
    };
  });
  const manifestFile = publishableFiles.find(
    ({ file }) => file === manifestPath,
  );
  const payloadFiles = publishableFiles.filter(
    ({ file }) => file !== manifestPath,
  );
  if (!manifestFile) {
    throw new Error(
      `[deploy-azure] missing ${manifestPath} from publishable files.`,
    );
  }

  let uploaded = 0;
  let reused = 0;
  logger.log(
    `[deploy-azure] publishing ${files.length} file(s) to ` +
      `${ctx.account ?? "(account)"}/${ctx.containerName ?? "(container)"} …`,
  );

  const publishFile = async ({ file, rel, shared, key }) => {
    if (shared && env.ALLOW_OVERWRITE !== "1" && (await exists(ctx, key))) {
      reused += 1;
      logger.log(`  = ${key} (already published)`);
      return;
    }

    const body = readFileSync(file);
    await upload(ctx, key, body, {
      contentType: contentTypeFor(rel),
      cacheControl: "public, max-age=31536000, immutable",
    });
    uploaded += 1;
    logger.log(`  ↑ ${key} (${body.length} bytes)`);
  };

  // Publishing the manifest last ensures an interrupted deployment can
  // never expose a build whose payload is incomplete.
  await runWithConcurrency(payloadFiles, uploadConcurrency, publishFile);
  await publishFile(manifestFile);

  logger.log(
    `[deploy-azure] published build ${identity.buildId} ` +
      `(${uploaded} uploaded, ${reused} reused).`,
  );

  if (env.LAYERSWAP_PROMOTE === "false") {
    logger.log(
      `[deploy-azure] LAYERSWAP_PROMOTE=false — channel ${identity.channel} NOT changed. ` +
        "Promote later with:",
    );
    logger.log(
      `               node scripts/rollback-azure.mjs ` +
        `${identity.channel} ${identity.buildId}`,
    );
    return { uploaded, reused, promoted: false };
  }

  const channelKey = `${identity.channel}/manifest.json`;
  const previous = await readJson(ctx, channelKey);
  await publishChannel(ctx, identity.channel, manifest);
  logger.log(
    `[deploy-azure] channel ${identity.channel}: ` +
      `${previous?.buildId ?? "(none)"} → ${identity.buildId}`,
  );
  logger.log(`[deploy-azure] live at /${identity.channel}/manifest.json`);
  return { uploaded, reused, promoted: true };
}

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entryUrl === import.meta.url) {
  try {
    await deployAzureBuild();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
