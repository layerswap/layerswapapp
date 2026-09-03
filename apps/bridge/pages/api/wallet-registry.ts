import type { NextApiRequest, NextApiResponse } from "next";
import { unstable_cache } from "next/cache";
import { WALLET_REGISTRY_BATCH_LIMIT, fetchRegistrySnapshot, matchRegistrySnapshot, normalizeRegistryNames, type Web3ModalWallet } from "@layerswap/wallet-core/registry-snapshot";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

const SNAPSHOT_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '6113382c2e587bff00e2b5c3d68531f3';

const getCachedSnapshot = unstable_cache(
    () => fetchRegistrySnapshot(PROJECT_ID),
    ["wallet-registry-snapshot"],
    { revalidate: SNAPSHOT_REVALIDATE_SECONDS },
);

let lastSnapshot: Web3ModalWallet[] | null = null;

async function readSnapshot(): Promise<Web3ModalWallet[]> {
    try {
        lastSnapshot = await getCachedSnapshot();
        return lastSnapshot;
    } catch (error) {
        if (lastSnapshot) return lastSnapshot;
        throw error;
    }
}

function setCorsHeaders(res: NextApiResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    setCorsHeaders(res);
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST, OPTIONS");
        return res.status(405).json({ error: "Method not allowed" });
    }

    const names = typeof req.body === "object" && req.body ? (req.body as { names?: unknown }).names : undefined;
    if (!Array.isArray(names) || !names.length || names.length > WALLET_REGISTRY_BATCH_LIMIT || names.some(name => typeof name !== "string" || !name.trim())) {
        return res.status(400).json({ error: `names must be 1-${WALLET_REGISTRY_BATCH_LIMIT} non-empty strings` });
    }

    try {
        const snapshot = await readSnapshot();
        return res.status(200).json({ wallets: matchRegistrySnapshot(snapshot, normalizeRegistryNames(names), PROJECT_ID) });
    } catch (error) {
        console.error("[api/wallet-registry] registry snapshot unavailable", error);
        return res.status(502).json({ error: "Wallet registry unavailable" });
    }
}
