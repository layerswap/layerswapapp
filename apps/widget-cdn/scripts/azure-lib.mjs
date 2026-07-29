// Shared Azure Blob Storage helpers for deploy + rollback.
//
// Authentication uses a short-lived Microsoft Entra token from Azure CLI:
//   - locally: run `az login`
//   - GitHub Actions: run `azure/login` with OIDC first
//
// Required environment:
//   AZURE_STORAGE_ACCOUNT
//   AZURE_STORAGE_CONTAINER (default: widget-cdn)
//
// AZURE_STORAGE_BLOB_ENDPOINT is optional and supports sovereign clouds or a
// custom Blob endpoint. No account key or connection string is required.

import { execFileSync } from "node:child_process";

const CONTENT_TYPES = {
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
};

export function contentTypeFor(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function requireEnv(env, name) {
  const value = env[name];
  if (!value) throw new Error(`[azure] missing required env var ${name}`);
  return value;
}

export function makeClient(env = process.env) {
  const account = requireEnv(env, "AZURE_STORAGE_ACCOUNT");
  const containerName = env.AZURE_STORAGE_CONTAINER || "widget-cdn";
  const endpoint =
    env.AZURE_STORAGE_BLOB_ENDPOINT ||
    `https://${account}.blob.core.windows.net`;
  let accessToken = env.AZURE_STORAGE_ACCESS_TOKEN;
  if (!accessToken) {
    try {
      accessToken = execFileSync(
        "az",
        [
          "account",
          "get-access-token",
          "--resource",
          env.AZURE_STORAGE_TOKEN_RESOURCE || "https://storage.azure.com/",
          "--query",
          "accessToken",
          "--output",
          "tsv",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
    } catch (err) {
      const detail = err?.stderr?.toString().trim();
      throw new Error(
        "[azure] could not obtain an Azure CLI access token. Run `az login` first" +
          `${detail ? `: ${detail}` : "."}`,
      );
    }
  }
  if (!accessToken)
    throw new Error("[azure] Azure CLI returned an empty access token");
  return {
    account,
    containerName,
    endpoint: endpoint.replace(/\/+$/, ""),
    accessToken,
  };
}

function objectUrl(ctx, key) {
  const container = encodeURIComponent(ctx.containerName);
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${ctx.endpoint}/${container}/${encodedKey}`;
}

async function blobRequest(ctx, key, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${ctx.accessToken}`);
  headers.set("x-ms-date", new Date().toUTCString());
  headers.set("x-ms-version", "2023-11-03");
  return fetch(objectUrl(ctx, key), { ...init, headers });
}

async function throwResponseError(operation, key, response) {
  const message = (await response.text()).trim();
  throw new Error(
    `[azure] ${operation} ${key} failed with ${response.status} ${response.statusText}` +
      `${message ? `: ${message}` : ""}`,
  );
}

export async function objectExists(ctx, key) {
  const response = await blobRequest(ctx, key, { method: "HEAD" });
  if (response.status === 404) return false;
  if (!response.ok) await throwResponseError("HEAD", key, response);
  return true;
}

export async function putObject(
  ctx,
  key,
  body,
  { contentType, cacheControl } = {},
) {
  const headers = {
    "Content-Type": "application/octet-stream",
    "x-ms-blob-type": "BlockBlob",
    "x-ms-blob-content-type": contentType ?? contentTypeFor(key),
  };
  if (cacheControl) headers["x-ms-blob-cache-control"] = cacheControl;
  const response = await blobRequest(ctx, key, {
    method: "PUT",
    headers,
    body,
  });
  if (!response.ok) await throwResponseError("PUT", key, response);
}

export async function readJsonObject(ctx, key) {
  const response = await blobRequest(ctx, key);
  if (response.status === 404) return undefined;
  if (!response.ok) await throwResponseError("GET", key, response);
  const value = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`[azure] ${key} does not contain a JSON object`);
  }
  return value;
}

export async function writeChannelManifest(ctx, channel, manifest) {
  await putObject(
    ctx,
    `${channel}/manifest.json`,
    Buffer.from(JSON.stringify(manifest, null, 2)),
    {
      contentType: "application/json; charset=utf-8",
      // This is the only mutable public object. New page loads must observe a
      // promotion immediately; immutable build files carry the long cache.
      cacheControl: "no-store, max-age=0",
    },
  );
}
