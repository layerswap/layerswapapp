// Fails the build when the Module Federation SYNCHRONOUS asset graph grows
// past a gzip budget. The sync set is every byte a host must download and
// parse before the widget's first paint — regressions here (e.g. a chain SDK
// or QR/canvas library slipping back into the root import graph) landed us at
// 842 KB gzip once; this guard keeps the fix from silently eroding.
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

const syncAssets = new Set();
for (const expose of stats.exposes ?? []) {
  for (const asset of expose.assets?.js?.sync ?? []) syncAssets.add(asset);
}
if (syncAssets.size === 0) {
  console.error(`[bundle-budget] ${statsPath} lists no synchronous expose assets — stats format changed?`);
  process.exit(1);
}

let totalGzip = 0;
const rows = [];
for (const asset of syncAssets) {
  const assetPath = normalize(join(buildDir, asset));
  const gz = gzipSync(readFileSync(assetPath), { level: 6 }).length;
  totalGzip += gz;
  rows.push({ asset, gz });
}
rows.sort((a, b) => b.gz - a.gz);

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
for (const { asset, gz } of rows) console.log(`[bundle-budget]   ${kib(gz).padStart(10)}  ${asset}`);
console.log(`[bundle-budget] ${syncAssets.size} sync assets, ${kib(totalGzip)} gzip total (budget ${kib(budget)})`);

if (totalGzip > budget) {
  console.error(
    `[bundle-budget] FAIL: synchronous JS is ${kib(totalGzip)} gzip, over the ${kib(budget)} budget. `
    + 'Find what joined the sync graph (compare mf-stats.json sync lists against the previous build) and lazy-load it; '
    + 'raise WIDGET_SYNC_GZIP_BUDGET only for a deliberate, reviewed increase.',
  );
  process.exit(1);
}
console.log('[bundle-budget] OK');
