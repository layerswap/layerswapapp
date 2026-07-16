import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseUnits } from "viem";
import { SignedLighterTx } from "@/lib/apiClients/lighterClient";

// SERVER-ONLY. Loads the vendored official Lighter signer WASM (built from
// elliottech/lighter-go `wasm/main.go`) via Node's WebAssembly + Go's wasm_exec glue.
// No npm dependency — two vendored files: lighter-signer.wasm + wasm_exec.js. See ../README.md.

const WASM_DIR = path.join(process.cwd(), "lib/wallets/lighter/server");
const WASM_FILE = path.join(WASM_DIR, "lighter-signer.wasm");

// Lighter protocol constants (not EVM chain IDs). Confirmed against lighter-go
// and the live testnet assetDetails response.
export const LIGHTER_USDC_ASSET_INDEX = 3;
export const LIGHTER_PERPS_ROUTE_TYPE = 0;
const LIGHTER_CHAIN_ID: Record<string, number> = { Mainnet: 304, Testnet: 300 };
const USDC_DECIMALS = 6;
const SKIP_NONCE = 0;

export class LighterSdkNotConfiguredError extends Error {
    constructor(detail?: string) {
        super(`Lighter signer unavailable${detail ? `: ${detail}` : ""}. Set LIGHTER_SIGNER_SECRET and vendor lighter-signer.wasm + wasm_exec.js (see README).`);
        this.name = "LighterSdkNotConfiguredError";
    }
}

export function hasSignerSecret(): boolean {
    return !!process.env.LIGHTER_SIGNER_SECRET;
}

type WasmResult<T> = T & { error?: string };
type ApiKeyPair = { privateKey: string; publicKey: string };
type SignResult = { txType: string; txInfo: string; txHash: string; messageToSign?: string };
type AuthResult = { authToken: string };

interface LighterWasm {
    CreateClient(url: string, privateKey: string, chainId: number, apiKeyIndex: number, accountIndex: number): WasmResult<{}>;
    GenerateAPIKey(): WasmResult<ApiKeyPair>;
    CreateAuthToken(deadline: number, apiKeyIndex: number, accountIndex: number): WasmResult<AuthResult>;
    SignChangePubKey(pubKeyHex: string, skipNonce: number, nonce: number, apiKeyIndex: number, accountIndex: number): WasmResult<SignResult>;
    SignTransfer(toAccountIndex: number, assetIndex: number, fromRouteType: number, toRouteType: number, amount: number, usdcFee: number, memo: string, skipNonce: number, nonce: number, apiKeyIndex: number, accountIndex: number): WasmResult<SignResult>;
}

let wasmPromise: Promise<LighterWasm> | undefined;

async function loadWasm(): Promise<LighterWasm> {
    if (wasmPromise) return wasmPromise;
    wasmPromise = (async () => {
        if (!hasSignerSecret()) throw new LighterSdkNotConfiguredError("LIGHTER_SIGNER_SECRET is not set");
        try {
            // wasm_exec.js (vendored from `$(go env GOROOT)/lib/wasm/wasm_exec.js`) defines globalThis.Go.
            await import(/* webpackIgnore: true */ path.join(WASM_DIR, "wasm_exec.js"));
            const Go = (globalThis as any).Go;
            if (!Go) throw new Error("wasm_exec.js did not define Go");
            const go = new Go();
            const bytes = await readFile(WASM_FILE);
            const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
            void go.run(instance); // registers CreateClient/GenerateAPIKey/Sign* on globalThis
            const g = globalThis as any;
            return {
                CreateClient: g.CreateClient,
                GenerateAPIKey: g.GenerateAPIKey,
                CreateAuthToken: g.CreateAuthToken,
                SignChangePubKey: g.SignChangePubKey,
                SignTransfer: g.SignTransfer,
            } as LighterWasm;
        } catch (e) {
            throw new LighterSdkNotConfiguredError((e as Error)?.message);
        }
    })();
    wasmPromise.catch(() => { wasmPromise = undefined; });
    return wasmPromise;
}

function unwrap<T>(r: WasmResult<T>): T {
    if (r?.error) throw new Error(r.error);
    return r;
}

// Model B key store. In-memory = TESTNET ONLY (survives within a running server process).
// Production MUST replace this with durable, encrypted-at-rest storage.
type LighterRuntimeKeyStore = {
    keys: Map<string, ApiKeyPair>;
    assignments: Map<string, number>;
};

// Keep testnet keys alive across Next.js development hot reloads. This remains
// process-local: a real restart/serverless cold start still requires the durable,
// encrypted production store described in README.md.
const runtimeGlobal = globalThis as typeof globalThis & {
    __layerswapLighterKeyStore?: LighterRuntimeKeyStore;
};
const runtimeKeyStore = runtimeGlobal.__layerswapLighterKeyStore ??= {
    keys: new Map<string, ApiKeyPair>(),
    assignments: new Map<string, number>(),
};
const keyStore = runtimeKeyStore.keys;
const keyAssignments = runtimeKeyStore.assignments;
const accountKeyId = (l1Address: string, accountIndex: number) => `${l1Address.toLowerCase()}:${accountIndex}`;
const keyId = (l1Address: string, accountIndex: number, apiKeyIndex: number) => `${l1Address.toLowerCase()}:${accountIndex}:${apiKeyIndex}`;

export type DerivedApiKey = ApiKeyPair & { apiKeyIndex: number };

export function getStoredApiKey(l1Address: string, accountIndex: number): DerivedApiKey | undefined {
    const apiKeyIndex = keyAssignments.get(accountKeyId(l1Address, accountIndex));
    if (apiKeyIndex === undefined) return undefined;
    const pair = keyStore.get(keyId(l1Address, accountIndex, apiKeyIndex));
    return pair ? { ...pair, apiKeyIndex } : undefined;
}

export async function resolveApiKey(l1Address: string, accountIndex: number, requestedApiKeyIndex?: number): Promise<DerivedApiKey> {
    const accountId = accountKeyId(l1Address, accountIndex);
    const assignedApiKeyIndex = keyAssignments.get(accountId);
    const apiKeyIndex = requestedApiKeyIndex ?? assignedApiKeyIndex;
    if (apiKeyIndex === undefined || !Number.isInteger(apiKeyIndex) || apiKeyIndex < 0 || apiKeyIndex > 254) {
        throw new LighterSdkNotConfiguredError("No safe API-key slot has been assigned");
    }

    if (assignedApiKeyIndex !== undefined && assignedApiKeyIndex !== apiKeyIndex) {
        keyStore.delete(keyId(l1Address, accountIndex, assignedApiKeyIndex));
    }
    keyAssignments.set(accountId, apiKeyIndex);

    const id = keyId(l1Address, accountIndex, apiKeyIndex);
    const existing = keyStore.get(id);
    if (existing) return { ...existing, apiKeyIndex };
    const wasm = await loadWasm();
    // A concurrent request may have populated the key while loadWasm awaited.
    const concurrent = keyStore.get(id);
    if (concurrent) return { ...concurrent, apiKeyIndex };
    const pair = unwrap(wasm.GenerateAPIKey());
    keyStore.set(id, { privateKey: pair.privateKey, publicKey: pair.publicKey });
    return { ...pair, apiKeyIndex };
}

async function withClient(nodeUrl: string, apiKey: DerivedApiKey, chain: string, accountIndex: number): Promise<LighterWasm> {
    const wasm = await loadWasm();
    const chainId = LIGHTER_CHAIN_ID[chain] ?? LIGHTER_CHAIN_ID.Testnet;
    unwrap(wasm.CreateClient(nodeUrl, apiKey.privateKey, chainId, apiKey.apiKeyIndex, accountIndex));
    return wasm;
}

export async function createAuthToken(nodeUrl: string, chain: string, accountIndex: number, apiKey: DerivedApiKey): Promise<string> {
    const wasm = await withClient(nodeUrl, apiKey, chain, accountIndex);
    const deadline = Math.floor(Date.now() / 1000) + 10 * 60;
    return unwrap(wasm.CreateAuthToken(deadline, apiKey.apiKeyIndex, accountIndex)).authToken;
}

export type SignFastWithdrawalTransferParams = {
    nodeUrl: string;
    chain: string;
    accountIndex: number;
    apiKey: DerivedApiKey;
    nonce: number;
    amount: string;
    feeBaseUnits: number;
    toAccountIndex: number;
    destinationRecipient: string;
};

function safeBaseUnits(value: string): number {
    const baseUnits = parseUnits(value, USDC_DECIMALS);
    if (baseUnits <= 0n || baseUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Lighter withdrawal amount is out of range");
    }
    return Number(baseUnits);
}

function recipientMemo(address: string): string {
    const hex = address.replace(/^0x/i, "");
    if (!/^[0-9a-f]{40}$/i.test(hex)) throw new Error("Invalid fast-withdraw recipient");
    return `0x${hex.padEnd(64, "0")}`;
}

export async function signFastWithdrawalTransfer(params: SignFastWithdrawalTransferParams): Promise<SignedLighterTx & { txHash: string; messageToSign: string }> {
    const wasm = await withClient(params.nodeUrl, params.apiKey, params.chain, params.accountIndex);
    const amountBaseUnits = safeBaseUnits(params.amount);
    const res = unwrap(wasm.SignTransfer(
        params.toAccountIndex,
        LIGHTER_USDC_ASSET_INDEX,
        LIGHTER_PERPS_ROUTE_TYPE,
        LIGHTER_PERPS_ROUTE_TYPE,
        amountBaseUnits,
        params.feeBaseUnits,
        recipientMemo(params.destinationRecipient),
        SKIP_NONCE,
        params.nonce,
        params.apiKey.apiKeyIndex,
        params.accountIndex,
    ));
    if (!res.messageToSign) throw new Error("Lighter transfer signature payload missing");
    return { txType: Number(res.txType), txInfo: res.txInfo, txHash: res.txHash, messageToSign: res.messageToSign };
}

export type SignChangePubKeyParams = {
    nodeUrl: string;
    chain: string;
    accountIndex: number;
    apiKey: DerivedApiKey;
    nonce: number;
};

// Returns the signed changePubKey tx AND messageToSign (the EIP-191 message the
// account's Ethereum wallet signs). The resulting signature is inserted as L1Sig.
export async function signChangePubKey(params: SignChangePubKeyParams): Promise<SignedLighterTx & { txHash: string; messageToSign?: string }> {
    const wasm = await withClient(params.nodeUrl, params.apiKey, params.chain, params.accountIndex);
    const res = unwrap(wasm.SignChangePubKey(params.apiKey.publicKey, SKIP_NONCE, params.nonce, params.apiKey.apiKeyIndex, params.accountIndex));
    return { txType: Number(res.txType), txInfo: res.txInfo, txHash: res.txHash, messageToSign: res.messageToSign };
}

export function attachL1Signature(txInfo: string, l1Signature: string): string {
    if (!/^0x[0-9a-f]{130}$/i.test(l1Signature)) throw new Error("Invalid L1 signature");
    const parsed = JSON.parse(txInfo) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid Lighter transaction");
    parsed.L1Sig = l1Signature;
    return JSON.stringify(parsed);
}
