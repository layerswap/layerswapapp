// prepublishOnly gate shared by @layerswap/widget-js and @layerswap/widget-react
// (react ships the loader via its widget-js dependency, so both publishes are
// poisoned by a sandbox origin).
//
// WIDGET_MANIFEST_URL is deliberately hardcoded — integrators must not be able
// to repoint the widget's trust anchor. The flip side is that publishing to npm
// with the sandbox storage account still baked in would pin every real
// integrator to a personal Azure account. This check makes that publish
// impossible instead of merely documented.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SANDBOX_MARKER = 'layerswapcdntest';
const manifestPath = fileURLToPath(new URL('../src/manifest.ts', import.meta.url));
const source = readFileSync(manifestPath, 'utf8');

if (source.includes(SANDBOX_MARKER)) {
  console.error(
    `[assert-production-origin] refusing to publish: packages/widget/js/src/manifest.ts still `
    + `references the sandbox storage account ("${SANDBOX_MARKER}").\n`
    + `Point WIDGET_MANIFEST_URL at the production CDN origin (and bake in the matching `
    + `production verify key) before publishing @layerswap/widget-js or @layerswap/widget-react.`,
  );
  process.exit(1);
}

console.log('[assert-production-origin] OK — no sandbox origin in the loader source');
