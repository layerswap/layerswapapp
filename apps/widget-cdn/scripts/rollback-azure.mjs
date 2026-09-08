#!/usr/bin/env node
// Promote a previously-published immutable Azure build by copying its signed
// manifest to the rolling /<channel>/manifest.json path.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  makeClient,
  readJsonObject,
  writeChannelManifest,
} from "./azure-lib.mjs";
import { isValidBuildId } from "./build-id.mjs";
import { remoteEntryForBuild } from "./cdn-layout.mjs";
import {
  WIDGET_PROTOCOL_MAJOR,
  widgetProtocolMajorOf,
} from "@layerswap/widget-js";

export async function rollbackAzureChannel(options) {
  const {
    channel,
    buildId,
    logger = console,
    readManifest = readJsonObject,
    writeManifest = writeChannelManifest,
  } = options;

  if (!channel || !/^v\d+$/.test(channel) || !isValidBuildId(buildId)) {
    throw new Error("[rollback-azure] invalid channel or buildId");
  }

  const ctx = options.ctx ?? makeClient(options.env);
  const manifestKey = `${buildId}/manifest.json`;
  const manifest = await readManifest(ctx, manifestKey);
  if (!manifest) {
    throw new Error(
      `[rollback-azure] build ${buildId} is not published ` +
        `(no ${manifestKey} in container).`,
    );
  }
  const protocolMajor = widgetProtocolMajorOf(manifest);
  if (
    manifest.buildId !== buildId ||
    manifest.channel !== channel ||
    protocolMajor !== WIDGET_PROTOCOL_MAJOR ||
    manifest.remoteEntry !== remoteEntryForBuild(buildId)
  ) {
    throw new Error(
      `[rollback-azure] ${buildId} does not contain a valid Azure manifest ` +
        `for ${channel}.`,
    );
  }

  if (typeof manifest.expiresAt === "string") {
    const expiresMs = Date.parse(manifest.expiresAt);
    const dayMs = 24 * 60 * 60 * 1000;
    if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
      throw new Error(
        `[rollback-azure] build ${buildId} expired at ${manifest.expiresAt} — ` +
          "loaders will refuse it. Re-publish and re-sign the build.",
      );
    }
    if (!Number.isNaN(expiresMs) && expiresMs - Date.now() < 3 * dayMs) {
      logger.warn(
        `[rollback-azure] warning: build ${buildId} expires ` +
          `${manifest.expiresAt} (<3 days).`,
      );
    }
  } else {
    logger.warn(
      `[rollback-azure] warning: build ${buildId} has no expiresAt; ` +
        "verifying loaders will reject it.",
    );
  }

  const current = await readManifest(ctx, `${channel}/manifest.json`);
  if (current?.buildId === buildId) {
    logger.log(
      `[rollback-azure] channel ${channel} already points at ${buildId} — nothing to do.`,
    );
    return { changed: false, previous: buildId };
  }

  await writeManifest(ctx, channel, manifest);
  logger.log(
    `[rollback-azure] channel ${channel}: ` +
      `${current?.buildId ?? "(none)"} → ${buildId}`,
  );
  logger.log(
    "[rollback-azure] channel manifest is no-store; any upstream CDN must honor that header.",
  );
  return { changed: true, previous: current?.buildId };
}

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entryUrl === import.meta.url) {
  const [, , channel, buildId] = process.argv;
  if (!channel || !/^v\d+$/.test(channel) || !isValidBuildId(buildId)) {
    console.error("usage: node scripts/rollback-azure.mjs <channel> <buildId>");
    console.error(
      "       e.g. node scripts/rollback-azure.mjs v1 1.7.0-abc123def456",
    );
    process.exitCode = 1;
  } else {
    try {
      await rollbackAzureChannel({ channel, buildId });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }
}
