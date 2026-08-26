import { createPublicKey } from "node:crypto";

export const PRODUCTION_MANIFEST_URL =
  "https://cdn.layerswap.io/widget/v1/manifest.json";

const KEY_PATTERN =
  /MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/;
const URL_PATTERN = /WIDGET_MANIFEST_URL\s*=\s*`([^`]+)`/;

function assertP256Spki(publicKeyB64) {
  let publicKey;
  try {
    publicKey = createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });
  } catch (error) {
    throw new Error(
      `production public key is not valid SPKI: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const namedCurve = publicKey.asymmetricKeyDetails?.namedCurve;
  if (
    publicKey.asymmetricKeyType !== "ec" ||
    (namedCurve !== "prime256v1" && namedCurve !== "P-256")
  ) {
    throw new Error("production public key must be ECDSA P-256 SPKI");
  }
}

export function assertProductionLoaderPolicy({
  loaderSource,
  productionPublicKeyB64,
}) {
  const expectedKey = productionPublicKeyB64?.trim();
  if (!expectedKey) {
    throw new Error(
      "LAYERSWAP_MANIFEST_PUBLIC_KEY_SPKI_B64 must contain the approved production public key",
    );
  }
  assertP256Spki(expectedKey);

  const keyMatch = loaderSource.match(KEY_PATTERN);
  if (!keyMatch) {
    throw new Error(
      "could not extract MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 from the loader source",
    );
  }

  const urlMatch = loaderSource.match(URL_PATTERN);
  if (!urlMatch) {
    throw new Error("could not extract WIDGET_MANIFEST_URL from the loader source");
  }
  const unresolvedUrl = urlMatch[1];
  const manifestUrl = unresolvedUrl.replace("${WIDGET_PROTOCOL_MAJOR}", "1");
  if (manifestUrl.includes("${")) {
    throw new Error("WIDGET_MANIFEST_URL contains an unsupported interpolation");
  }

  if (manifestUrl !== PRODUCTION_MANIFEST_URL) {
    throw new Error(
      `WIDGET_MANIFEST_URL must be ${PRODUCTION_MANIFEST_URL}, found ${manifestUrl}`,
    );
  }
  if (keyMatch[1] !== expectedKey) {
    throw new Error(
      "MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 does not match the production environment public key",
    );
  }
}
