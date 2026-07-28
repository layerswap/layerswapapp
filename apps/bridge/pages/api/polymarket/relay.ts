import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac } from "node:crypto";
import {
    POLYMARKET_RELAYER_URL,
    PROVIDER_DISABLED_CODE,
    isRelayerSubmittable,
} from "@layerswap/wallet-evm/polymarket-protocol";
import { isPolymarketEnabled } from "../../../flags";
import { validateRelaySubmitRequest } from "../../../lib/polymarket/validateRelaySubmit";

/**
 * Server-side proxy for the Polymarket relayer.
 *
 * The relayer's `/submit` requires builder API-key auth (an HMAC over the request),
 * which is a SERVER SECRET that must never reach the browser. This route holds the
 * builder credentials (env) and attaches the auth on submit. Public reads (nonce,
 * deployed, transaction) are forwarded too, so the client never calls the relayer
 * cross-origin.
 *
 * The user's Safe signature (built client-side) is what authorizes the actual fund
 * movement; the builder key only authorizes use of the relayer (gas sponsorship).
 *
 * Being public, submits are restricted to Layerswap withdrawals: the batch must be
 * exactly the shape `buildPolymarketDepositCalls` produces (validateRelaySubmit —
 * pure tx inspection, no swap lookup). Anything else is refused before the builder
 * auth is spent.
 *
 * Required env (server-only, NO `NEXT_PUBLIC_` prefix):
 *   POLYMARKET_BUILDER_API_KEY, POLYMARKET_BUILDER_SECRET, POLYMARKET_BUILDER_PASSPHRASE
 * Optional: POLYMARKET_RELAYER_URL (defaults to relayer-v2.polymarket.com).
 */

// A legit submit (a 4-call SAFE batch) is well under 10KB; cap the parsed body so the
// MultiSend decoder never sees megabytes of attacker hex.
export const config = { api: { bodyParser: { sizeLimit: "100kb" } } };

// Canonical value lives in the wallet package's polymarket constants (POLYMARKET_RELAYER_URL);
// inlined here to keep this server route free of a cross-package import (it already mirrors the
// relayer request union). Overridable via env.
const RELAYER_URL = (process.env.POLYMARKET_RELAYER_URL || POLYMARKET_RELAYER_URL).replace(/\/+$/, "");

// One generic message for every rejection class — no oracle for probing what passed.
const REJECTION_MESSAGE = "This withdrawal could not be verified. Please start over and try again.";

// Per-IP rate limiting. In-memory, so it's per-instance best-effort (a serverless
// deployment with many instances weakens it); enough to stop a single client from
// draining the builder API quota. No origin check on purpose — the flow may be embedded
// on third-party domains.
const RATE_WINDOW_MS = 60_000;
const POST_LIMIT = 20;
const GET_LIMIT = 150;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function clientIp(req: NextApiRequest): string {
    const xff = req.headers["x-forwarded-for"];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const ip = raw?.split(",")[0]?.trim();
    return ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit(key: string, limit: number): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    if (now - lastSweep > RATE_WINDOW_MS) {
        for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
        lastSweep = now;
    }
    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return { ok: true, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    return { ok: true, retryAfter: 0 };
}

/** Polymarket builder HMAC (mirrors @polymarket/builder-signing-sdk buildHmacSignature). */
function buildHmacSignature(secret: string, timestamp: number, method: string, requestPath: string, body?: string): string {
    let message = `${timestamp}${method}${requestPath}`;
    if (body !== undefined) message += body;
    const sig = createHmac("sha256", Buffer.from(secret, "base64")).update(message).digest("base64");
    return sig.split("+").join("-").split("/").join("_");
}

function builderHeaders(method: string, path: string, body?: string): Record<string, string> {
    const key = process.env.POLYMARKET_BUILDER_API_KEY;
    const secret = process.env.POLYMARKET_BUILDER_SECRET;
    const passphrase = process.env.POLYMARKET_BUILDER_PASSPHRASE;
    if (!key || !secret || !passphrase) {
        throw new Error("Polymarket builder credentials are not configured");
    }
    const ts = Math.floor(Date.now() / 1000);
    return {
        POLY_BUILDER_API_KEY: key,
        POLY_BUILDER_PASSPHRASE: passphrase,
        POLY_BUILDER_SIGNATURE: buildHmacSignature(secret, ts, method, path, body),
        POLY_BUILDER_TIMESTAMP: `${ts}`,
    };
}

async function forward(res: NextApiResponse, url: string, init: RequestInit) {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
}

function setCorsHeaders(res: NextApiResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        setCorsHeaders(res);
        if (req.method === "OPTIONS") {
            return res.status(204).end();
        }

        // Gate the relay behind the same kill switch as the Polymarket source routes —
        // when the provider is off (dashboard flag) or its builder creds are missing,
        // this credential-holding proxy must refuse traffic. The body is machine-readable
        // ("provider_disabled") so clients that still reach here — a stale cached bundle,
        // or a flag flipped mid-session — can show "temporarily unavailable" copy instead
        // of a generic failure (see the wallet package's polymarket relayerClient).
        if (!(await isPolymarketEnabled(req))) {
            return res.status(404).json({ error: PROVIDER_DISABLED_CODE });
        }

        if (req.method === "GET" || req.method === "POST") {
            const isPost = req.method === "POST";
            const { ok, retryAfter } = rateLimit(`${req.method}:${clientIp(req)}`, isPost ? POST_LIMIT : GET_LIMIT);
            if (!ok) {
                res.setHeader("Retry-After", `${retryAfter}`);
                return res.status(429).json({ error: "Too many requests" });
            }
        }

        if (req.method === "GET") {
            const action = String(req.query.action || "");
            if (action === "nonce" || action === "deployed") {
                const address = String(req.query.address || "");
                const type = String(req.query.type || "SAFE");
                if (!address) return res.status(400).json({ error: "address is required" });
                const qs = new URLSearchParams({ address, type }).toString();
                return forward(res, `${RELAYER_URL}/${action}?${qs}`, { method: "GET" });
            }
            if (action === "transaction") {
                const id = String(req.query.id || "");
                if (!id) return res.status(400).json({ error: "id is required" });
                const qs = new URLSearchParams({ id }).toString();
                return forward(res, `${RELAYER_URL}/transaction?${qs}`, { method: "GET" });
            }
            return res.status(400).json({ error: `Unsupported GET action: ${action}` });
        }

        if (req.method === "POST") {
            const { action, request } = (typeof req.body === "object" && req.body) || {};
            if (action !== "submit") return res.status(400).json({ error: `Unsupported POST action: ${action}` });
            if (!request) return res.status(400).json({ error: "request is required" });
            if (!isRelayerSubmittable(request)) return res.status(400).json({ error: `Unsupported request type: ${request?.type}` });

            // Only Layerswap deposits get relayed on the builder credentials: the batch
            // must be exactly the withdrawal shape — verified from the tx itself.
            const validation = validateRelaySubmitRequest(request);
            if (!validation.ok) {
                console.error("[polymarket/relay] submit rejected", { type: request?.type, reason: validation.reason });
                return res.status(403).json({ error: REJECTION_MESSAGE });
            }

            const body = JSON.stringify(request);
            const headers = { "Content-Type": "application/json", ...builderHeaders("POST", "/submit", body) };
            return forward(res, `${RELAYER_URL}/submit`, { method: "POST", headers, body });
        }

        res.setHeader("Allow", "GET, POST, OPTIONS");
        return res.status(405).json({ error: "Method not allowed" });
    } catch (e) {
        // Never surface internal/credential error text to the browser — log it server-side
        // and return a generic message.
        console.error("[polymarket/relay] proxy error", e);
        return res.status(500).json({ error: "Relayer proxy error" });
    }
}
