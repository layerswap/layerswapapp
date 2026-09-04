import type { NextApiRequest, NextApiResponse } from "next";
import { unstable_cache } from "next/cache";
import { DEFAULT_WALLETCONNECT_PROJECT_ID, WALLET_REGISTRY_BATCH_LIMIT, fetchRegistrySnapshot, matchRegistrySnapshot, normalizeRegistryNames, type Web3ModalWallet } from "@layerswap/wallet-core";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

const SNAPSHOT_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;

const getCachedSnapshot = unstable_cache(
    (projectId: string) => fetchRegistrySnapshot(projectId),
    ["wallet-registry-snapshot"],
    { revalidate: SNAPSHOT_REVALIDATE_SECONDS },
);

const lastSnapshots = new Map<string, Web3ModalWallet[]>();

async function readSnapshot(projectId: string): Promise<Web3ModalWallet[]> {
    try {
        const snapshot = await getCachedSnapshot(projectId);
        lastSnapshots.set(projectId, snapshot);
        return snapshot;
    } catch (error) {
        const lastSnapshot = lastSnapshots.get(projectId);
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

    const body = (typeof req.body === "object" && req.body ? req.body : {}) as { names?: string[]; projectId?: string };
    const { names } = body;
    if (!Array.isArray(names) || !names.length || names.length > WALLET_REGISTRY_BATCH_LIMIT || names.some(name => typeof name !== "string" || !name.trim())) {
        return res.status(400).json({ error: `names must be 1-${WALLET_REGISTRY_BATCH_LIMIT} non-empty strings` });
    }
    const projectId = body.projectId || DEFAULT_WALLETCONNECT_PROJECT_ID;

    try {
        const snapshot = await readSnapshot(projectId);
        return res.status(200).json({ wallets: matchRegistrySnapshot(snapshot, normalizeRegistryNames(names), projectId) });
    } catch (error) {
        console.error("[api/wallet-registry] registry snapshot unavailable", error);
        return res.status(502).json({ error: "Wallet registry unavailable" });
    }
}
