import { createPublicKey } from "node:crypto";

export const MANIFEST_PUBLIC_KEY_ENV =
  "LAYERSWAP_MANIFEST_PUBLIC_KEY_SPKI_B64";
export const PRODUCTION_DEPLOY_TARGET = "widget-cdn-production";

const KEY_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const LOADER_KEY_PATTERN =
  /MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/;

export function resolveManifestVerificationKey({
  environmentValue,
  loaderSource,
  requireEnvironment = false,
}) {
  const configuredValue = environmentValue?.trim();
  let publicKeyB64;
  let source;

  if (configuredValue) {
    publicKeyB64 = configuredValue;
    source = `environment variable ${MANIFEST_PUBLIC_KEY_ENV}`;
  } else {
    if (requireEnvironment) {
      throw new Error(
        `${MANIFEST_PUBLIC_KEY_ENV} is not configured for this protected deployment`,
      );
    }
    const match = loaderSource.match(LOADER_KEY_PATTERN);
    if (!match) {
      throw new Error(
        "could not extract MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 from widget-js source",
      );
    }
    publicKeyB64 = match[1];
    source = "widget-js loader trust anchor";
  }

  if (publicKeyB64.length % 4 !== 0 || !KEY_PATTERN.test(publicKeyB64)) {
    throw new Error(`${source} is not canonical base64`);
  }

  const publicKeyDer = Buffer.from(publicKeyB64, "base64");
  if (publicKeyDer.toString("base64") !== publicKeyB64) {
    throw new Error(`${source} is not canonical base64`);
  }

  let publicKey;
  try {
    publicKey = createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "spki",
    });
  } catch (error) {
    throw new Error(
      `${source} is not a valid SPKI public key: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const namedCurve = publicKey.asymmetricKeyDetails?.namedCurve;
  if (
    publicKey.asymmetricKeyType !== "ec" ||
    (namedCurve !== "prime256v1" && namedCurve !== "P-256")
  ) {
    throw new Error(`${source} must be an ECDSA P-256 SPKI public key`);
  }

  return { publicKey, publicKeyB64, source };
}

export function assertProductionLoaderKeyMatch({
  deployTarget,
  environmentPublicKeyB64,
  loaderPublicKeyB64,
}) {
  if (deployTarget !== PRODUCTION_DEPLOY_TARGET) return;
  if (environmentPublicKeyB64 !== loaderPublicKeyB64) {
    throw new Error(
      "production environment public key does not match " +
        "MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 in the widget-js loader",
    );
  }
}
