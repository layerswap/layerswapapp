import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { putObject, writeChannelManifest } from "./azure-lib.mjs";
import { deployAzureBuild } from "./deploy-azure.mjs";
import { rollbackAzureChannel } from "./rollback-azure.mjs";
import {
  ASSET_BASE,
  deploymentKey,
  remoteEntryForBuild,
} from "./cdn-layout.mjs";

const silentLogger = { log() {}, warn() {} };

test("content-hashed chunks use the shared asset namespace", () => {
  assert.equal(
    deploymentKey("1.7.0-0123456789ab", "837.0123456789abcdef.js"),
    "assets/837.0123456789abcdef.js",
  );
  assert.equal(
    deploymentKey("1.7.0-0123456789ab", "remoteEntry.js"),
    "1.7.0-0123456789ab/remoteEntry.js",
  );
});

test("Azure Blob PUT uses Entra auth, encoded keys, and blob HTTP properties", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(null, { status: 201 });
  };

  await putObject(
    {
      endpoint: "https://test.blob.core.windows.net",
      containerName: "widget-cdn",
      accessToken: "short-lived-token",
    },
    "build id/remoteEntry.js",
    Buffer.from("remote"),
    {
      contentType: "text/javascript; charset=utf-8",
      cacheControl: "public, max-age=31536000, immutable",
    },
  );

  assert.equal(
    request.url,
    "https://test.blob.core.windows.net/widget-cdn/build%20id/remoteEntry.js",
  );
  const headers = new Headers(request.init.headers);
  assert.equal(headers.get("authorization"), "Bearer short-lived-token");
  assert.equal(headers.get("x-ms-blob-type"), "BlockBlob");
  assert.equal(
    headers.get("x-ms-blob-content-type"),
    "text/javascript; charset=utf-8",
  );
  assert.equal(
    headers.get("x-ms-blob-cache-control"),
    "public, max-age=31536000, immutable",
  );
});

test("Azure channel manifests disable browser and edge caching", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(null, { status: 201 });
  };

  await writeChannelManifest(
    {
      endpoint: "https://test.blob.core.windows.net",
      containerName: "widget-cdn",
      accessToken: "short-lived-token",
    },
    "v1",
    { protocolMajor: 1, buildId: "1.7.0-0123456789ab" },
  );

  assert.match(request.url, /\/v1\/manifest\.json$/);
  const headers = new Headers(request.init.headers);
  assert.equal(headers.get("x-ms-blob-cache-control"), "no-store, max-age=0");
});

function deployFixture(t, identity, manifestOverrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "layerswap-deploy-azure-"));
  const dist = join(root, "dist", identity.buildId);
  mkdirSync(dist, { recursive: true });
  writeFileSync(
    join(dist, "manifest.json"),
    JSON.stringify({
      ...identity,
      protocolMajor: 1,
      remoteEntry: remoteEntryForBuild(identity.buildId),
      assetBase: ASSET_BASE,
      chunks: {},
      signature: "signed",
      ...manifestOverrides,
    }),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("Azure deploy rejects a channel-relative remote before creating a client", async (t) => {
  const identity = {
    buildId: "1.7.0-0123456789ab",
    version: "1.7.0",
    channel: "v1",
    gitSha: "0123456789abcdef",
  };
  const root = deployFixture(t, identity, { remoteEntry: "./remoteEntry.js" });
  mkdirSync(join(root, "dist", "assets"));
  let clientsCreated = 0;

  await assert.rejects(
    deployAzureBuild({
      root,
      identity,
      logger: silentLogger,
      createClient() {
        clientsCreated += 1;
        return {};
      },
    }),
    /remoteEntry/,
  );
  assert.equal(clientsCreated, 0);
});

test("Azure deploy reuses shared assets and promotes the signed manifest", async (t) => {
  const identity = {
    buildId: "1.7.0-0123456789ab",
    version: "1.7.0",
    channel: "v1",
    gitSha: "0123456789abcdef",
  };
  const root = deployFixture(t, identity);
  const buildDir = join(root, "dist", identity.buildId);
  const assetDir = join(root, "dist", "assets");
  const assetName = "837.0123456789abcdef.js";
  mkdirSync(assetDir);
  writeFileSync(join(buildDir, "remoteEntry.js"), "remote");
  writeFileSync(join(assetDir, assetName), "chunk");

  const uploadedKeys = [];
  const promotions = [];
  const result = await deployAzureBuild({
    root,
    identity,
    logger: silentLogger,
    createClient: () => ({ account: "test", containerName: "widget-cdn" }),
    objectExists: async (_ctx, key) => key === `assets/${assetName}`,
    putObject: async (_ctx, key) => uploadedKeys.push(key),
    readJsonObject: async () => ({ buildId: "1.6.0-aaaaaaaaaaaa" }),
    writeChannelManifest: async (_ctx, channel, manifest) => {
      promotions.push({ channel, buildId: manifest.buildId });
    },
  });

  assert.deepEqual(result, { uploaded: 2, reused: 1, promoted: true });
  assert.deepEqual(uploadedKeys, [
    `${identity.buildId}/remoteEntry.js`,
    `${identity.buildId}/manifest.json`,
  ]);
  assert.deepEqual(promotions, [{ channel: "v1", buildId: identity.buildId }]);
});

test("Azure deploy publishes the immutable manifest after all payloads", async (t) => {
  const identity = {
    buildId: "1.7.0-0123456789ab",
    version: "1.7.0",
    channel: "v1",
    gitSha: "0123456789abcdef",
  };
  const root = deployFixture(t, identity);
  const buildDir = join(root, "dist", identity.buildId);
  const assetDir = join(root, "dist", "assets");
  mkdirSync(assetDir);
  writeFileSync(join(buildDir, "remoteEntry.js"), "remote");
  writeFileSync(join(assetDir, "one.0123456789abcdef.js"), "one");
  writeFileSync(join(assetDir, "two.fedcba9876543210.js"), "two");

  let activePayloadUploads = 0;
  const completedKeys = [];
  await deployAzureBuild({
    root,
    identity,
    env: { LAYERSWAP_PROMOTE: "false" },
    logger: silentLogger,
    uploadConcurrency: 2,
    createClient: () => ({ account: "test", containerName: "widget-cdn" }),
    objectExists: async () => false,
    putObject: async (_ctx, key) => {
      if (key.endsWith("/manifest.json")) {
        assert.equal(activePayloadUploads, 0);
      } else {
        activePayloadUploads += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        activePayloadUploads -= 1;
      }
      completedKeys.push(key);
    },
  });

  assert.equal(completedKeys.at(-1), `${identity.buildId}/manifest.json`);
});

test("Azure rollback promotes a valid immutable manifest", async () => {
  const buildId = "1.7.0-0123456789ab";
  const writes = [];
  const result = await rollbackAzureChannel({
    channel: "v1",
    buildId,
    ctx: {},
    logger: silentLogger,
    readManifest: async (_ctx, key) =>
      key.startsWith(buildId)
        ? {
            buildId,
            channel: "v1",
            remoteEntry: remoteEntryForBuild(buildId),
            expiresAt: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }
        : { buildId: "1.6.0-aaaaaaaaaaaa" },
    writeManifest: async (_ctx, channel, manifest) => {
      writes.push({ channel, buildId: manifest.buildId });
    },
  });

  assert.deepEqual(result, { changed: true, previous: "1.6.0-aaaaaaaaaaaa" });
  assert.deepEqual(writes, [{ channel: "v1", buildId }]);
});

test("Azure rollback rejects a manifest that cannot resolve from the channel path", async () => {
  const buildId = "1.7.0-0123456789ab";
  let writes = 0;
  await assert.rejects(
    rollbackAzureChannel({
      channel: "v1",
      buildId,
      ctx: {},
      logger: silentLogger,
      readManifest: async () => ({
        buildId,
        channel: "v1",
        protocolMajor: 1,
        remoteEntry: "./remoteEntry.js",
      }),
      writeManifest: async () => {
        writes += 1;
      },
    }),
    /valid Azure manifest/,
  );
  assert.equal(writes, 0);
});
