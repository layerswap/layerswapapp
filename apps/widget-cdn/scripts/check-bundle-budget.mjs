// Fails the build when the Module Federation SYNCHRONOUS asset graph grows
// past a gzip budget. The sync set is every byte a host must download and
// parse before the widget's first paint — regressions here (e.g. a chain SDK
// or QR/canvas library slipping back into the root import graph) landed us at
// 842 KB gzip once; this guard keeps the fix from silently eroding.
//
// The budget applies PER EXPOSE, not to the union of all exposes: a page
// mounts exactly one widget (`./Widget`/`./mount` or `./DepositWidget`/
// `./mountDeposit`), so the bytes a host actually downloads before first
// paint are one expose's sync set. Their graphs overlap almost entirely;
// summing the union would count each sibling widget's private chunk against
// every other widget's budget.
//
// Budget override (bytes): WIDGET_SYNC_GZIP_BUDGET env var. Raise it only for
// a deliberate, reviewed increase — not to make a red build green.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BUDGET_GZIP_BYTES = 680_000;

const budget = Number(process.env.WIDGET_SYNC_GZIP_BUDGET) || DEFAULT_BUDGET_GZIP_BYTES;
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

// The manifest step writes one immutable build dir per build id; check the
// freshest one (the build that just ran).
const statsFiles = readdirSync(distDir)
  .map((entry) => join(distDir, entry, 'mf-stats.json'))
  .filter((p) => existsSync(p))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

if (statsFiles.length === 0) {
  console.error('[bundle-budget] no mf-stats.json found under dist/ — run the rspack build first');
  process.exit(1);
}
const statsPath = statsFiles[0];
const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
const buildDir = dirname(statsPath);

const exposes = (stats.exposes ?? []).filter((e) => (e.assets?.js?.sync ?? []).length > 0);
if (exposes.length === 0) {
  console.error(`[bundle-budget] ${statsPath} lists no synchronous expose assets — stats format changed?`);
  process.exit(1);
}

// gzip each distinct asset once — the exposes' sync sets overlap heavily.
const gzCache = new Map();
const gzipOf = (asset) => {
  if (!gzCache.has(asset)) {
    const assetPath = normalize(join(buildDir, asset));
    gzCache.set(asset, gzipSync(readFileSync(assetPath), { level: 6 }).length);
  }
  return gzCache.get(asset);
};

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
const perExpose = exposes.map((expose) => {
  const assets = [...new Set(expose.assets.js.sync)];
  const rows = assets
    .map((asset) => ({ asset, gz: gzipOf(asset) }))
    .sort((a, b) => b.gz - a.gz);
  return { name: expose.path ?? expose.name, rows, totalGzip: rows.reduce((sum, r) => sum + r.gz, 0) };
}).sort((a, b) => b.totalGzip - a.totalGzip);

// Detail the heaviest expose; one summary line for each of the rest.
const heaviest = perExpose[0];
for (const { asset, gz } of heaviest.rows) console.log(`[bundle-budget]   ${kib(gz).padStart(10)}  ${asset}`);
for (const { name, rows, totalGzip } of perExpose) {
  console.log(`[bundle-budget] ${name}: ${rows.length} sync assets, ${kib(totalGzip)} gzip (budget ${kib(budget)})`);
}

const over = perExpose.filter((e) => e.totalGzip > budget);
if (over.length > 0) {
  console.error(
    `[bundle-budget] FAIL: ${over.map((e) => `${e.name} is ${kib(e.totalGzip)} gzip`).join(', ')}, over the ${kib(budget)} per-expose budget. `
    + 'Find what joined the sync graph (compare mf-stats.json sync lists against the previous build) and lazy-load it; '
    + 'raise WIDGET_SYNC_GZIP_BUDGET only for a deliberate, reviewed increase.',
  );
  process.exit(1);
}
console.log('[bundle-budget] OK');
