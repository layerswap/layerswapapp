import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { listObjects } from "./azure-lib.mjs";
import { readAzureChannelPointers } from "./cleanup-azure.mjs";
import {
  parseCleanupArgs,
  partitionObjects,
  planCleanup,
  runCleanup,
  runCleanupCli,
} from "./cleanup-lib.mjs";

const silentLogger = { log() {}, warn() {} };

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-08-01T00:00:00Z");

function iso(offsetDays) {
  return new Date(NOW + offsetDays * DAY_MS).toISOString();
}

function build(buildId, { manifest, ageDays = 10, extraKeys = [] } = {}) {
  const lastModified = new Date(NOW - ageDays * DAY_MS);
  const keys = [
    ...(manifest !== null
      ? [{ key: `${buildId}/manifest.json`, lastModified }]
      : []),
    { key: `${buildId}/remoteEntry.js`, lastModified },
    ...extraKeys.map((key) => ({ key, lastModified })),
  ];
  return { buildId, keys, manifest: manifest ?? null };
}

function manifestFor(buildId, { channel = "v1", issuedDays = -10, expiresDays = 20, chunks = {} } = {}) {
  return {
    buildId,
    channel,
    issuedAt: iso(issuedDays),
    expiresAt: iso(expiresDays),
    chunks,
  };
}

test("partitionObjects separates builds, assets, channels, and unknowns", () => {
  const { builds, assets, channelObjects, unknown } = partitionObjects([
    { key: "1.7.0-abc/manifest.json" },
    { key: "1.7.0-abc/remoteEntry.js" },
    { key: "assets/837.0123456789abcdef.js" },
    { key: "assets/README.txt" },
    { key: "v1/manifest.json" },
    { key: "stray-file" },
  ]);
  assert.deepEqual([...builds.keys()], ["1.7.0-abc"]);
  assert.equal(builds.get("1.7.0-abc").length, 2);
  assert.deepEqual(assets.map((a) => a.name), ["837.0123456789abcdef.js"]);
  assert.deepEqual(channelObjects.map((o) => o.key), ["v1/manifest.json"]);
  assert.deepEqual(unknown.map((o) => o.key), ["assets/README.txt", "stray-file"]);
});

test("planCleanup keeps promoted and unexpired builds, deletes expired ones", () => {
  const chunk = "837.0123456789abcdef.js";
  const promoted = build("1.7.0-promoted", {
    manifest: manifestFor("1.7.0-promoted", { expiresDays: -5, chunks: { [chunk]: "sha384-x" } }),
    ageDays: 60,
  });
  const fresh = build("1.7.0-fresh", {
    manifest: manifestFor("1.7.0-fresh", { issuedDays: -1, expiresDays: 29 }),
  });
  const stale = [1, 2, 3, 4].map((n) =>
    build(`1.6.${n}-stale`, {
      manifest: manifestFor(`1.6.${n}-stale`, { issuedDays: -100 - n, expiresDays: -70 - n }),
      ageDays: 100 + n,
    }),
  );

  const plan = planCleanup({
    now: NOW,
    channels: { v1: "1.7.0-promoted" },
    builds: [promoted, fresh, ...stale],
    assets: [],
    minRecentPerChannel: 2,
  });

  const kept = Object.fromEntries(plan.keepBuilds.map((b) => [b.buildId, b.reasons]));
  // Promoted survives even though expired — and that expiry is loudly warned.
  assert.deepEqual(kept["1.7.0-promoted"], ["recent", "promoted:v1"]);
  assert.ok(kept["1.7.0-fresh"].includes("unexpired"));
  // minRecentPerChannel=2 → promoted + fresh are the 2 most recent; all four
  // stale expired builds go.
  assert.deepEqual(
    plan.deleteBuilds.map((b) => b.buildId).sort(),
    ["1.6.1-stale", "1.6.2-stale", "1.6.3-stale", "1.6.4-stale"],
  );
  assert.ok(plan.warnings.some((w) => w.includes("EXPIRED")));
});

test("planCleanup keeps the N most recent builds per channel even when all expired", () => {
  const builds = [1, 2, 3].map((n) =>
    build(`1.5.${n}-old`, {
      manifest: manifestFor(`1.5.${n}-old`, { issuedDays: -100 + n, expiresDays: -70 + n }),
    }),
  );
  const plan = planCleanup({
    now: NOW,
    channels: {},
    builds,
    assets: [],
    minRecentPerChannel: 2,
  });
  assert.deepEqual(
    plan.keepBuilds.map((b) => b.buildId).sort(),
    ["1.5.2-old", "1.5.3-old"],
  );
  assert.deepEqual(plan.deleteBuilds.map((b) => b.buildId), ["1.5.1-old"]);
});

test("planCleanup grace-protects manifest-less uploads, deletes old orphans", () => {
  const inFlight = build("1.8.0-inflight", { manifest: null, ageDays: 0.5 });
  const abandoned = build("1.8.0-abandoned", { manifest: null, ageDays: 30 });
  const plan = planCleanup({
    now: NOW,
    channels: {},
    builds: [inFlight, abandoned],
    assets: [],
    minRecentPerChannel: 0,
  });
  assert.deepEqual(plan.keepBuilds, [
    { buildId: "1.8.0-inflight", reasons: ["upload-grace"] },
  ]);
  assert.deepEqual(plan.deleteBuilds.map((b) => b.buildId), ["1.8.0-abandoned"]);
});

test("planCleanup mark-and-sweeps shared assets against retained manifests", () => {
  const referencedChunk = "aaa.0123456789abcdef.js";
  const kept = build("1.7.0-live", {
    manifest: manifestFor("1.7.0-live", {
      chunks: { [referencedChunk]: "sha384-a", "remoteEntry.js": "sha384-r" },
    }),
  });
  const plan = planCleanup({
    now: NOW,
    channels: { v1: "1.7.0-live" },
    builds: [kept],
    assets: [
      { key: `assets/${referencedChunk}`, name: referencedChunk, lastModified: new Date(NOW - 90 * DAY_MS) },
      { key: "assets/bbb.fedcba9876543210.js", name: "bbb.fedcba9876543210.js", lastModified: new Date(NOW - 90 * DAY_MS) },
      { key: "assets/ccc.1111111111111111.js", name: "ccc.1111111111111111.js", lastModified: new Date(NOW - 1 * 60 * 60 * 1000) },
    ],
  });
  assert.deepEqual(plan.deleteAssets, ["assets/bbb.fedcba9876543210.js"]);
  assert.equal(plan.referencedAssets, 1);
  assert.equal(plan.gracedAssets, 1);
});

test("planCleanup keeps and warns about anomalies", () => {
  const mismatched = build("1.7.0-prefix", {
    manifest: { buildId: "1.7.0-OTHER", channel: "v1", expiresAt: iso(-50), issuedAt: iso(-80), chunks: {} },
  });
  const plan = planCleanup({
    now: NOW,
    channels: { v1: "1.9.9-missing" },
    builds: [mismatched],
    assets: [],
    minRecentPerChannel: 0,
  });
  assert.deepEqual(plan.deleteBuilds, []);
  assert.ok(plan.warnings.some((w) => w.includes("no published build prefix")));
  assert.ok(plan.warnings.some((w) => w.includes("manifest claiming to be")));
});

function fakeStorage() {
  const objects = new Map([
    [
      "1.7.0-live/manifest.json",
      JSON.stringify(manifestFor("1.7.0-live", { chunks: { "aaa.0123456789abcdef.js": "sha384-a" } })),
    ],
    ["1.7.0-live/remoteEntry.js", "remote"],
    [
      "1.6.0-dead/manifest.json",
      JSON.stringify(manifestFor("1.6.0-dead", { issuedDays: -100, expiresDays: -70 })),
    ],
    ["1.6.0-dead/remoteEntry.js", "remote"],
    ["assets/aaa.0123456789abcdef.js", "chunk"],
    ["assets/bbb.fedcba9876543210.js", "chunk"],
  ]);
  const deletions = [];
  return {
    objects,
    deletions,
    ops: {
      listObjects: async () =>
        [...objects.keys()].map((key) => ({ key, lastModified: new Date(NOW - 90 * DAY_MS) })),
      readJson: async (_ctx, key) =>
        objects.has(key) ? JSON.parse(objects.get(key)) : undefined,
      readChannelPointers: async () => ({ v1: "1.7.0-live" }),
      deleteObject: async (_ctx, key) => {
        deletions.push(key);
        objects.delete(key);
      },
    },
  };
}

test("runCleanup dry run reports the plan and deletes nothing", async () => {
  const storage = fakeStorage();
  const result = await runCleanup({
    ctx: {},
    ops: storage.ops,
    now: NOW,
    logger: silentLogger,
    minRecentPerChannel: 1,
  });
  assert.equal(result.applied, false);
  assert.deepEqual(result.deleteBuilds.map((b) => b.buildId), ["1.6.0-dead"]);
  assert.deepEqual(result.deleteAssets, ["assets/bbb.fedcba9876543210.js"]);
  assert.deepEqual(storage.deletions, []);
});

test("runCleanup --apply deletes the build manifest before its payload", async () => {
  const storage = fakeStorage();
  const result = await runCleanup({
    ctx: {},
    ops: storage.ops,
    apply: true,
    now: NOW,
    logger: silentLogger,
    minRecentPerChannel: 1,
  });
  assert.equal(result.applied, true);
  assert.deepEqual(storage.deletions, [
    "1.6.0-dead/manifest.json",
    "1.6.0-dead/remoteEntry.js",
    "assets/bbb.fedcba9876543210.js",
  ]);
  assert.ok(storage.objects.has("1.7.0-live/manifest.json"));
  assert.ok(storage.objects.has("assets/aaa.0123456789abcdef.js"));
});

test("runCleanup aborts apply when a channel pointer changes mid-plan", async () => {
  const storage = fakeStorage();
  let reads = 0;
  storage.ops.readChannelPointers = async () =>
    (reads += 1) === 1 ? { v1: "1.7.0-live" } : { v1: "1.6.0-dead" };
  await assert.rejects(
    runCleanup({
      ctx: {},
      ops: storage.ops,
      apply: true,
      now: NOW,
      logger: silentLogger,
      minRecentPerChannel: 1,
    }),
    /channel pointers changed/,
  );
  assert.deepEqual(storage.deletions, []);
});

test("Azure listObjects paginates and decodes the XML listing", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const pages = [
    `<?xml version="1.0"?><EnumerationResults>
       <Blobs>
         <Blob><Name>1.7.0-abc/manifest.json</Name><Properties><Last-Modified>Fri, 01 Aug 2026 00:00:00 GMT</Last-Modified></Properties></Blob>
         <Blob><Name>assets/a&amp;b.0123456789abcdef.js</Name><Properties><Last-Modified>Fri, 01 Aug 2026 00:00:00 GMT</Last-Modified></Properties></Blob>
       </Blobs>
       <NextMarker>page-2</NextMarker>
     </EnumerationResults>`,
    `<?xml version="1.0"?><EnumerationResults>
       <Blobs>
         <Blob><Name>v1/manifest.json</Name><Properties><Last-Modified>Fri, 01 Aug 2026 00:00:00 GMT</Last-Modified></Properties></Blob>
       </Blobs>
       <NextMarker />
     </EnumerationResults>`,
  ];
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return new Response(pages.shift(), { status: 200 });
  };

  const results = await listObjects({
    endpoint: "https://test.blob.core.windows.net",
    containerName: "widget-cdn",
    accessToken: "token",
  });

  assert.deepEqual(
    results.map((r) => r.key),
    ["1.7.0-abc/manifest.json", "assets/a&b.0123456789abcdef.js", "v1/manifest.json"],
  );
  assert.equal(results[0].lastModified.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[1], /marker=page-2/);
});

test("Azure channel pointers come from vN/manifest.json blobs", async () => {
  const pointers = await readAzureChannelPointers(
    {},
    {
      list: async () => [
        { key: "v1/manifest.json" },
        { key: "v2/manifest.json" },
        { key: "v1-not-a-channel/manifest.json" },
      ],
      readJson: async (_ctx, key) =>
        key === "v1/manifest.json"
          ? { buildId: "1.7.0-abc" }
          : { buildId: "!!invalid!!" },
    },
  );
  assert.deepEqual(pointers, { v1: "1.7.0-abc" });
});

test("runCleanup --apply with an approved plan deletes only its intersection with fresh state", async () => {
  const storage = fakeStorage();
  // The approved plan covers the dead build but NOT the orphaned asset — the
  // asset became deletable after approval and must be deferred. It also
  // approves a build that no longer exists — skipped, not an error.
  const result = await runCleanup({
    ctx: {},
    ops: storage.ops,
    apply: true,
    approvedPlan: {
      deleteBuilds: [{ buildId: "1.6.0-dead" }, { buildId: "1.0.0-gone" }],
      deleteAssets: [],
    },
    now: NOW,
    logger: silentLogger,
    minRecentPerChannel: 1,
  });
  assert.equal(result.applied, true);
  assert.deepEqual(storage.deletions, [
    "1.6.0-dead/manifest.json",
    "1.6.0-dead/remoteEntry.js",
  ]);
  assert.ok(storage.objects.has("assets/bbb.fedcba9876543210.js"));
});

test("runCleanupCli round-trips a plan file from --plan-out to --apply --plan-in", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "layerswap-cleanup-plan-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const planPath = join(dir, "plan.json");

  const storage = fakeStorage();
  const planned = await runCleanupCli({
    argv: ["--plan-out", planPath, "--keep-recent", "1"],
    ctx: {},
    ops: storage.ops,
    logger: silentLogger,
    now: NOW,
  });
  assert.equal(planned.applied, false);
  assert.deepEqual(storage.deletions, []);
  const written = JSON.parse(readFileSync(planPath, "utf8"));
  assert.deepEqual(written.deleteBuilds.map((b) => b.buildId), ["1.6.0-dead"]);
  assert.deepEqual(written.deleteAssets, ["assets/bbb.fedcba9876543210.js"]);

  const applied = await runCleanupCli({
    argv: ["--apply", "--plan-in", planPath, "--keep-recent", "1"],
    ctx: {},
    ops: storage.ops,
    logger: silentLogger,
    now: NOW,
  });
  assert.equal(applied.applied, true);
  assert.deepEqual(storage.deletions, [
    "1.6.0-dead/manifest.json",
    "1.6.0-dead/remoteEntry.js",
    "assets/bbb.fedcba9876543210.js",
  ]);
});

test("runCleanupCli rejects contradictory plan flags", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "layerswap-cleanup-flags-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const planPath = join(dir, "plan.json");
  writeFileSync(planPath, "{}");
  const storage = fakeStorage();
  await assert.rejects(
    runCleanupCli({
      argv: ["--apply", "--plan-out", planPath],
      ctx: {},
      ops: storage.ops,
      logger: silentLogger,
      now: NOW,
    }),
    /--plan-out captures a dry-run plan/,
  );
  await assert.rejects(
    runCleanupCli({
      argv: ["--plan-in", planPath],
      ctx: {},
      ops: storage.ops,
      logger: silentLogger,
      now: NOW,
    }),
    /--plan-in only applies an approved plan/,
  );
  assert.deepEqual(storage.deletions, []);
});

test("parseCleanupArgs parses flags and rejects unknown ones", () => {
  assert.deepEqual(parseCleanupArgs([]), { apply: false });
  const parsed = parseCleanupArgs([
    "--apply",
    "--keep-recent",
    "5",
    "--asset-grace-days",
    "3",
    "--build-grace-days",
    "1",
  ]);
  assert.equal(parsed.apply, true);
  assert.equal(parsed.minRecentPerChannel, 5);
  assert.equal(parsed.assetGraceMs, 3 * 24 * 60 * 60 * 1000);
  assert.equal(parsed.orphanGraceMs, 1 * 24 * 60 * 60 * 1000);
  assert.deepEqual(parseCleanupArgs(["--plan-out", "p.json"]), {
    apply: false,
    planOut: "p.json",
  });
  assert.deepEqual(parseCleanupArgs(["--apply", "--plan-in", "p.json"]), {
    apply: true,
    planIn: "p.json",
  });
  assert.throws(() => parseCleanupArgs(["--nope"]), /unknown argument/);
  assert.throws(() => parseCleanupArgs(["--keep-recent", "x"]), /non-negative number/);
  assert.throws(() => parseCleanupArgs(["--plan-out"]), /expects a file path/);
});
