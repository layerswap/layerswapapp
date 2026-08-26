import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  MANIFEST_PUBLIC_KEY_ENV,
  PRODUCTION_DEPLOY_TARGET,
  assertProductionLoaderKeyMatch,
  resolveManifestVerificationKey,
} from "./manifest-verification-key.mjs";

function p256PublicKey() {
  const { publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  return publicKey.export({ format: "der", type: "spki" }).toString("base64");
}

test("protected deployments use the environment public key", () => {
  const environmentValue = p256PublicKey();
  const resolved = resolveManifestVerificationKey({
    environmentValue,
    loaderSource: "not used",
    requireEnvironment: true,
  });

  assert.equal(resolved.publicKeyB64, environmentValue);
  assert.equal(
    resolved.source,
    `environment variable ${MANIFEST_PUBLIC_KEY_ENV}`,
  );
});

test("protected deployments fail when the environment key is missing", () => {
  assert.throws(
    () =>
      resolveManifestVerificationKey({
        environmentValue: "",
        loaderSource: "",
        requireEnvironment: true,
      }),
    new RegExp(`${MANIFEST_PUBLIC_KEY_ENV} is not configured`),
  );
});

test("local verification falls back to the loader trust anchor", () => {
  const loaderKey = p256PublicKey();
  const resolved = resolveManifestVerificationKey({
    loaderSource:
      `export const MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 = '${loaderKey}';`,
  });

  assert.equal(resolved.publicKeyB64, loaderKey);
  assert.equal(resolved.source, "widget-js loader trust anchor");
});

test("malformed and non-P-256 environment keys fail closed", () => {
  assert.throws(
    () =>
      resolveManifestVerificationKey({
        environmentValue: "not base64!",
        loaderSource: "",
      }),
    /not canonical base64/,
  );

  const { publicKey } = generateKeyPairSync("ed25519");
  const ed25519 = publicKey
    .export({ format: "der", type: "spki" })
    .toString("base64");
  assert.throws(
    () =>
      resolveManifestVerificationKey({
        environmentValue: ed25519,
        loaderSource: "",
      }),
    /must be an ECDSA P-256 SPKI public key/,
  );
});

test("production requires the environment key to match the loader", () => {
  const productionKey = p256PublicKey();
  assert.doesNotThrow(() =>
    assertProductionLoaderKeyMatch({
      deployTarget: PRODUCTION_DEPLOY_TARGET,
      environmentPublicKeyB64: productionKey,
      loaderPublicKeyB64: productionKey,
    }),
  );

  assert.throws(
    () =>
      assertProductionLoaderKeyMatch({
        deployTarget: PRODUCTION_DEPLOY_TARGET,
        environmentPublicKeyB64: productionKey,
        loaderPublicKeyB64: p256PublicKey(),
      }),
    /production environment public key does not match/,
  );
});

test("sandbox may use a key different from the production loader", () => {
  assert.doesNotThrow(() =>
    assertProductionLoaderKeyMatch({
      deployTarget: "widget-cdn-azure-sandbox",
      environmentPublicKeyB64: p256PublicKey(),
      loaderPublicKeyB64: p256PublicKey(),
    }),
  );
});
