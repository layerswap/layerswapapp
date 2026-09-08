import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  PRODUCTION_MANIFEST_URL,
  assertProductionLoaderPolicy,
} from "../scripts/production-loader-policy.mjs";

function p256PublicKey() {
  const { publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  return publicKey.export({ format: "der", type: "spki" }).toString("base64");
}

function loaderSource({
  url = PRODUCTION_MANIFEST_URL.replace("/v1/", "/v${WIDGET_PROTOCOL_MAJOR}/"),
  key,
} = {}) {
  return `
    export const MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 = '${key}';
    export const WIDGET_MANIFEST_URL = \`${url}\`;
  `;
}

test("production publication accepts only the configured URL and key", () => {
  const productionKey = p256PublicKey();
  assert.doesNotThrow(() =>
    assertProductionLoaderPolicy({
      loaderSource: loaderSource({ key: productionKey }),
      productionPublicKeyB64: productionKey,
    }),
  );
});

test("production publication rejects a sandbox URL", () => {
  const productionKey = p256PublicKey();
  assert.throws(
    () =>
      assertProductionLoaderPolicy({
        loaderSource: loaderSource({
          key: productionKey,
          url: "https://layerswapcdntest.blob.core.windows.net/widget-cdn/v${WIDGET_PROTOCOL_MAJOR}/manifest.json",
        }),
        productionPublicKeyB64: productionKey,
      }),
    /WIDGET_MANIFEST_URL must be/,
  );
});

test("production publication rejects a sandbox or unapproved public key", () => {
  assert.throws(
    () =>
      assertProductionLoaderPolicy({
        loaderSource: loaderSource({ key: p256PublicKey() }),
        productionPublicKeyB64: p256PublicKey(),
      }),
    /does not match the production environment public key/,
  );
});

test("production publication requires a valid configured P-256 public key", () => {
  assert.throws(
    () =>
      assertProductionLoaderPolicy({
        loaderSource: loaderSource({ key: "invalid" }),
        productionPublicKeyB64: "",
      }),
    /must contain the approved production public key/,
  );
});
