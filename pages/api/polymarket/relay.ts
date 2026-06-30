import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac } from "node:crypto";
import { POLYMARKET_RELAYER_URL } from "@/lib/wallets/polymarket/constants";

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
 * Required env (server-only, NO `NEXT_PUBLIC_` prefix):
 *   POLYMARKET_BUILDER_API_KEY, POLYMARKET_BUILDER_SECRET, POLYMARKET_BUILDER_PASSPHRASE
 * Optional: POLYMARKET_RELAYER_URL (defaults to relayer-v2.polymarket.com).
 */

const RELAYER_URL = (process.env.POLYMARKET_RELAYER_URL || POLYMARKET_RELAYER_URL).replace(/\/+$/, "");

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
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
            const { action, request } = req.body ?? {};
            if (action !== "submit") return res.status(400).json({ error: `Unsupported POST action: ${action}` });
            if (!request) return res.status(400).json({ error: "request is required" });

            const body = JSON.stringify(request);
            const headers = { "Content-Type": "application/json", ...builderHeaders("POST", "/submit", body) };
            return forward(res, `${RELAYER_URL}/submit`, { method: "POST", headers, body });
        }

        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "Method not allowed" });
    } catch (e) {
        return res.status(500).json({ error: (e as Error)?.message || "Relayer proxy error" });
    }
}
