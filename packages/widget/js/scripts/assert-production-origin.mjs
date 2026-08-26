// prepublishOnly gate shared by @layerswap/widget-js and @layerswap/widget-react
// (react ships the loader via its widget-js dependency, so both publishes are
// poisoned by a sandbox origin or trust key).
//
// WIDGET_MANIFEST_URL is deliberately hardcoded — integrators must not be able
// to repoint the widget's trust anchor. The flip side is that publishing to npm
// with the sandbox storage account still baked in would pin every real
// integrator to a personal Azure account. This check makes that publish
// impossible instead of merely documented.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertProductionLoaderPolicy } from "./production-loader-policy.mjs";

const manifestPath = fileURLToPath(
  new URL("../src/manifest.ts", import.meta.url),
);

try {
  assertProductionLoaderPolicy({
    loaderSource: readFileSync(manifestPath, "utf8"),
    productionPublicKeyB64:
      process.env.LAYERSWAP_MANIFEST_PUBLIC_KEY_SPKI_B64,
  });
} catch (error) {
  console.error(
    `[assert-production-origin] refusing to publish: ${error instanceof Error ? error.message : String(error)}.`,
  );
  process.exit(1);
}

console.log(
  "[assert-production-origin] OK — production CDN origin and trust key are pinned",
);
