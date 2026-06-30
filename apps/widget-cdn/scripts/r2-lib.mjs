// Shared R2 helpers for the deploy + rollback scripts.
//
// R2 is S3-compatible, so we drive it with the AWS S3 SDK pointed at the
// account's R2 endpoint. Credentials come from env (an R2 API token with
// Object Read & Write on the target bucket):
//
//   R2_ACCOUNT_ID         Cloudflare account id
//   R2_ACCESS_KEY_ID      R2 token access key id
//   R2_SECRET_ACCESS_KEY  R2 token secret
//   R2_BUCKET             bucket name (default: layerswap-widget-cdn)

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';

export const CHANNELS_KEY = 'channels.json';

const CONTENT_TYPES = {
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json; charset=utf-8',
    map: 'application/json; charset=utf-8',
};

export function contentTypeFor(name) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function requireEnv(name) {
    const v = process.env[name];
    if (!v) {
        console.error(`[r2] missing required env var ${name}`);
        process.exit(1);
    }
    return v;
}

export function makeClient() {
    const accountId = requireEnv('R2_ACCOUNT_ID');
    return {
        bucket: process.env.R2_BUCKET || 'layerswap-widget-cdn',
        client: new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
                secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
            },
        }),
    };
}

export async function objectExists({ client, bucket }, key) {
    try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch (err) {
        if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
        throw err;
    }
}

export async function putObject({ client, bucket }, key, body, { contentType, cacheControl } = {}) {
    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType ?? contentTypeFor(key),
            CacheControl: cacheControl,
        }),
    );
}

export async function readChannels(ctx) {
    try {
        const res = await ctx.client.send(new GetObjectCommand({ Bucket: ctx.bucket, Key: CHANNELS_KEY }));
        const text = await res.Body.transformToString();
        return JSON.parse(text);
    } catch (err) {
        if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey') return {};
        throw err;
    }
}

export async function writeChannels(ctx, channels) {
    await putObject(ctx, CHANNELS_KEY, JSON.stringify(channels, null, 2), {
        contentType: 'application/json; charset=utf-8',
        // The pointer must never be cached hard — the Worker reads the freshest
        // copy so channel flips (roll-forward / rollback) take effect promptly.
        cacheControl: 'no-store',
    });
}
