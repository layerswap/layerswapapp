import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { formatUnits, getAddress, isAddress, parseUnits, verifyMessage, type Hex } from "viem";
import { isLighterEnabled } from "@/flags";
import { resolveLighterNodeUrl } from "@/lib/wallets/lighter/constants";
import { LIGHTER_FAST_WITHDRAW_MIN_USDC, LIGHTER_ROUTES, LIGHTER_USDC_MIN_TRANSFER_USDC } from "@/lib/wallets/lighter/routes";
import { LighterApiError, LighterClient, isLighterOk, lighterAccountIndex, type LighterAccount } from "@/lib/apiClients/lighterClient";
import {
    attachL1Signature,
    createAuthToken,
    getStoredApiKey,
    resolveApiKey,
    signChangePubKey,
    signFastWithdrawalTransfer,
    LighterSdkNotConfiguredError,
    type DerivedApiKey,
} from "@/lib/wallets/lighter/server/signer";

const RATE_WINDOW_MS = 60_000;
const POST_LIMIT = 20;
const GET_LIMIT = 150;
const TOKEN_TTL_MS = 10 * 60_000;
const USDC_DECIMALS = 6;
const REGISTRATION_POLL_ATTEMPTS = 10;
const REGISTRATION_POLL_INTERVAL_MS = 750;
// 253 is the conventional read-only SDK slot and 255 is Lighter's default/all-
// keys sentinel. Prefer the documented "typically unused" slot 252, then walk
// down a reserved high range without touching common SDK slots such as 3-7.
const API_KEY_CANDIDATES = Array.from({ length: 125 }, (_, offset) => 252 - offset);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

type PreparedRegistration = {
    action: "register";
    expiresAt: number;
    network: string;
    address: string;
    accountIndex: number;
    apiKeyIndex: number;
    publicKey: string;
    txType: number;
    txInfo: string;
    txHash: string;
    message: string;
};

type PreparedWithdrawal = {
    action: "withdraw";
    expiresAt: number;
    network: string;
    address: string;
    accountIndex: number;
    apiKeyIndex: number;
    publicKey: string;
    txInfo: string;
    txHash: string;
    message: string;
    destinationRecipient: string;
};

type PreparedWithdrawalQuote = {
    action: "withdrawQuote";
    expiresAt: number;
    network: string;
    address: string;
    accountIndex: number;
    apiKeyIndex: number;
    publicKey: string;
    netAmount: string;
    maxFee: string;
};

type PreparedAction = PreparedRegistration | PreparedWithdrawalQuote | PreparedWithdrawal;

class RelayError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
        this.name = "RelayError";
    }
}

function clientIp(req: NextApiRequest): string {
    const xff = req.headers["x-forwarded-for"];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    return raw?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
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

function signerSecret(): string {
    const secret = process.env.LIGHTER_SIGNER_SECRET;
    if (!secret) throw new LighterSdkNotConfiguredError("LIGHTER_SIGNER_SECRET is not set");
    return secret;
}

function seal(payload: PreparedAction): string {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", signerSecret()).update(data).digest("base64url");
    return `${data}.${signature}`;
}

function unseal<T extends PreparedAction>(token: unknown, action: T["action"]): T {
    if (typeof token !== "string") throw new RelayError(400, "Signed preparation token is required");
    const [data, signature, extra] = token.split(".");
    if (!data || !signature || extra) throw new RelayError(400, "Invalid preparation token");
    const expected = createHmac("sha256", signerSecret()).update(data).digest();
    let actual: Buffer;
    try {
        actual = Buffer.from(signature, "base64url");
    } catch {
        throw new RelayError(400, "Invalid preparation token");
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new RelayError(400, "Invalid preparation token");
    }
    let payload: PreparedAction;
    try {
        payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    } catch {
        throw new RelayError(400, "Invalid preparation token");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new RelayError(400, "Invalid preparation token");
    }
    if (payload.action !== action || !Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) {
        const expired = Number.isFinite(payload.expiresAt) && payload.expiresAt < Date.now();
        throw new RelayError(400, expired ? "Preparation expired; please try again" : "Invalid preparation token");
    }
    return payload as T;
}

function resolveNodeUrl(network: string): string {
    const nodeUrl = network ? resolveLighterNodeUrl(network, undefined) : undefined;
    if (!nodeUrl) throw new RelayError(400, "Unsupported Lighter network");
    return nodeUrl;
}

function resolveChain(network: string): string {
    const chain = LIGHTER_ROUTES[network]?.lighterChain;
    if (!chain) throw new RelayError(400, "Unsupported Lighter network");
    return chain;
}

function normalizedAddress(value: unknown, field: string): string {
    if (typeof value !== "string" || !isAddress(value)) throw new RelayError(400, `${field} must be a valid EVM address`);
    return getAddress(value);
}

async function resolveAccount(client: LighterClient, address: string, nodeUrl: string): Promise<{ account: LighterAccount; accountIndex: number }> {
    const account = await client.getAccountByL1Address(address, nodeUrl);
    if (!account) throw new RelayError(400, "No Lighter account for this wallet");
    return { account, accountIndex: lighterAccountIndex(account) };
}

async function waitForApiKeyRegistration(
    client: LighterClient,
    accountIndex: number,
    apiKeyIndex: number,
    publicKey: string,
    nodeUrl: string,
): Promise<boolean> {
    for (let attempt = 0; attempt < REGISTRATION_POLL_ATTEMPTS; attempt += 1) {
        if (await client.isApiKeyRegistered(accountIndex, apiKeyIndex, publicKey, nodeUrl)) return true;
        if (attempt + 1 < REGISTRATION_POLL_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, REGISTRATION_POLL_INTERVAL_MS));
        }
    }
    return false;
}

async function verifyWalletSignature(address: string, message: string, signature: unknown): Promise<string> {
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
        throw new RelayError(400, "A valid wallet signature is required");
    }
    const valid = await verifyMessage({ address: address as Hex, message, signature: signature as Hex });
    if (!valid) throw new RelayError(401, "Wallet signature does not match the Lighter account");
    return signature;
}

function amountBaseUnits(value: unknown): bigint {
    if (typeof value !== "string" || !/^\d+(\.\d{1,6})?$/.test(value)) throw new RelayError(400, "Invalid USDC amount");
    const amount = parseUnits(value, USDC_DECIMALS);
    if (amount <= 0n) throw new RelayError(400, "Withdrawal amount must be positive");
    return amount;
}

function normalizedPublicKey(value: string | undefined): string | undefined {
    return value?.replace(/^0x/i, "").toLowerCase();
}

function publicKeysEqual(a: string | undefined, b: string | undefined): boolean {
    return !!a && !!b && normalizedPublicKey(a) === normalizedPublicKey(b);
}

function transactionHashesEqual(a: string | undefined, b: string | undefined): boolean {
    const normalize = (value: string | undefined) => value?.replace(/^0x/i, "").toLowerCase();
    return !!a && !!b && normalize(a) === normalize(b);
}

function verifiedTransactionHash(expected: string, actual: string | undefined): string {
    if (!/^(0x)?[0-9a-f]+$/i.test(expected)) {
        throw new RelayError(502, "Lighter signer returned an invalid transaction hash");
    }
    if (actual && !transactionHashesEqual(expected, actual)) {
        throw new RelayError(502, "Lighter returned an unexpected transaction hash");
    }
    return actual || expected;
}

async function getFastWithdrawalTerms(params: {
    client: LighterClient;
    account: LighterAccount;
    accountIndex: number;
    apiKey: DerivedApiKey;
    nodeUrl: string;
    chain: string;
    netAmount?: bigint;
    grossAmount?: bigint;
    maxFee?: bigint;
}) {
    const { client, account, accountIndex, apiKey, nodeUrl, chain, grossAmount, maxFee } = params;
    if ((params.netAmount === undefined) === (grossAmount === undefined)) {
        throw new RelayError(500, "Invalid Lighter withdrawal amount mode");
    }
    const auth = await createAuthToken(nodeUrl, chain, accountIndex, apiKey);
    const info = await client.getFastWithdrawalInfo(accountIndex, auth, nodeUrl);
    if (!isLighterOk(info)) throw new RelayError(503, info.message || "Lighter fast withdrawals are unavailable");

    const feeBaseUnits = await client.getTransferFee(accountIndex, info.to_account_index, auth, nodeUrl);
    const fee = BigInt(feeBaseUnits);
    if (maxFee !== undefined && fee > maxFee) {
        throw new RelayError(
            409,
            `Lighter's fast-withdraw fee changed from ${formatUnits(maxFee, USDC_DECIMALS)} to ${formatUnits(fee, USDC_DECIMALS)} USDC before signing; review the updated fee and try again`,
        );
    }

    if (grossAmount !== undefined && grossAmount <= fee) {
        throw new RelayError(400, `Withdrawal amount must be greater than Lighter's current ${formatUnits(fee, USDC_DECIMALS)} USDC fee`);
    }
    const netAmount = grossAmount !== undefined ? grossAmount - fee : params.netAmount!;
    const debitAmount = netAmount + fee;
    const minimumDebit = parseUnits(String(LIGHTER_FAST_WITHDRAW_MIN_USDC), USDC_DECIMALS);
    const minimumTransfer = parseUnits(String(LIGHTER_USDC_MIN_TRANSFER_USDC), USDC_DECIMALS);
    if (debitAmount < minimumDebit || netAmount < minimumTransfer) {
        const requiredDebit = minimumDebit > fee + minimumTransfer ? minimumDebit : fee + minimumTransfer;
        throw new RelayError(400, `Lighter fast withdrawals currently require at least ${formatUnits(requiredDebit, USDC_DECIMALS)} USDC including its fee`);
    }
    const withdrawLimit = parseUnits(info.withdraw_limit, USDC_DECIMALS);
    const maxWithdrawal = parseUnits(info.max_withdrawal_amount, USDC_DECIMALS);
    const available = parseUnits(String(account.available_balance ?? account.collateral ?? "0"), USDC_DECIMALS);
    if (debitAmount > withdrawLimit || debitAmount > maxWithdrawal) throw new RelayError(400, "Withdrawal exceeds Lighter's current fast-withdraw limit");
    if (debitAmount > available) throw new RelayError(400, "Insufficient Lighter balance for the withdrawal and fee");

    return { auth, info, feeBaseUnits, fee, netAmount, debitAmount };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Prepared payloads and wallet-signing challenges must never be cached by
        // browsers, CDNs, or intermediary proxies.
        res.setHeader("Cache-Control", "no-store");
        if (!(await isLighterEnabled(req))) return res.status(404).json({ error: "Not found" });

        if (req.method !== "GET" && req.method !== "POST") {
            res.setHeader("Allow", "GET, POST");
            return res.status(405).json({ error: "Method not allowed" });
        }

        const isPost = req.method === "POST";
        const { ok, retryAfter } = rateLimit(`${req.method}:${clientIp(req)}`, isPost ? POST_LIMIT : GET_LIMIT);
        if (!ok) {
            res.setHeader("Retry-After", `${retryAfter}`);
            return res.status(429).json({ error: "Too many requests" });
        }

        const client = new LighterClient();

        if (req.method === "GET") {
            const action = String(req.query.action || "");
            if (action !== "registration") throw new RelayError(400, `Unsupported GET action: ${action}`);

            const network = String(req.query.network || "");
            const address = normalizedAddress(req.query.address, "address");
            const nodeUrl = resolveNodeUrl(network);
            const chain = resolveChain(network);
            const { accountIndex } = await resolveAccount(client, address, nodeUrl);
            const registeredKeys = await client.getApiKeys(accountIndex, nodeUrl);
            const stored = getStoredApiKey(address, accountIndex);
            const storedSlot = stored
                ? registeredKeys.find(key => Number(key.api_key_index) === stored.apiKeyIndex)
                : undefined;
            const canReuseStored = !!stored && (!storedSlot || publicKeysEqual(storedSlot.public_key, stored.publicKey));
            const occupied = new Set(registeredKeys.map(key => Number(key.api_key_index)));
            const availableIndex = API_KEY_CANDIDATES.find(index => !occupied.has(index));
            if (!canReuseStored && availableIndex === undefined) {
                throw new RelayError(409, "No unused Lighter API-key slot is available for Layerswap");
            }
            const apiKey = canReuseStored ? stored : await resolveApiKey(address, accountIndex, availableIndex);
            const registered = !!storedSlot && publicKeysEqual(storedSlot.public_key, apiKey.publicKey);
            if (registered) return res.status(200).json({ registered: true, publicKey: apiKey.publicKey });

            const nonce = await client.getNextNonce(accountIndex, apiKey.apiKeyIndex, nodeUrl);
            const signed = await signChangePubKey({ nodeUrl, chain, accountIndex, apiKey, nonce });
            if (!signed.messageToSign) throw new RelayError(502, "Lighter registration signature payload missing");
            const registrationToken = seal({
                action: "register",
                expiresAt: Date.now() + TOKEN_TTL_MS,
                network,
                address,
                accountIndex,
                apiKeyIndex: apiKey.apiKeyIndex,
                publicKey: apiKey.publicKey,
                txType: signed.txType,
                txInfo: signed.txInfo,
                txHash: signed.txHash,
                message: signed.messageToSign,
            });
            return res.status(200).json({
                registered: false,
                publicKey: apiKey.publicKey,
                registrationToken,
                signPayload: { type: "message", message: signed.messageToSign },
            });
        }

        const action = String(req.body?.action || "");

        if (action === "register") {
            const prepared = unseal<PreparedRegistration>(req.body?.registrationToken, "register");
            const l1Signature = await verifyWalletSignature(prepared.address, prepared.message, req.body?.l1Signature);
            const apiKey = getStoredApiKey(prepared.address, prepared.accountIndex);
            if (!apiKey || apiKey.apiKeyIndex !== prepared.apiKeyIndex || !publicKeysEqual(apiKey.publicKey, prepared.publicKey)) {
                throw new RelayError(409, "Lighter signing session expired; restart setup");
            }
            const txInfo = attachL1Signature(prepared.txInfo, l1Signature);
            const nodeUrl = resolveNodeUrl(prepared.network);
            const currentSlot = (await client.getApiKeys(prepared.accountIndex, nodeUrl))
                .find(key => Number(key.api_key_index) === prepared.apiKeyIndex);
            if (currentSlot && !publicKeysEqual(currentSlot.public_key, prepared.publicKey)) {
                throw new RelayError(409, "The selected Lighter API-key slot was claimed by another client; restart setup");
            }
            const response = await client.sendTx({ txType: prepared.txType, txInfo }, nodeUrl);
            if (!isLighterOk(response)) return res.status(200).json({ ok: false, error: response.message });
            verifiedTransactionHash(prepared.txHash, response.tx_hash);

            // The API-key query is eventually consistent after sendTx. Waiting here
            // prevents the immediately following withdrawal preparation from racing it.
            const registered = await waitForApiKeyRegistration(
                client,
                prepared.accountIndex,
                apiKey.apiKeyIndex,
                apiKey.publicKey,
                nodeUrl,
            );
            if (!registered) {
                throw new RelayError(503, "Lighter accepted setup but has not activated the key yet; please try again");
            }
            return res.status(200).json({ ok: true });
        }

        if (action === "checkWithdrawal") {
            const network = String(req.body?.network || "");
            const address = normalizedAddress(req.body?.l1Address, "l1Address");
            const requestedAmount = amountBaseUnits(req.body?.amount);
            const amountType = String(req.body?.amountType || "gross");
            if (amountType !== "gross" && amountType !== "net") throw new RelayError(400, "Invalid withdrawal amount type");
            const nodeUrl = resolveNodeUrl(network);
            const chain = resolveChain(network);
            const { account, accountIndex } = await resolveAccount(client, address, nodeUrl);
            const apiKey = getStoredApiKey(address, accountIndex);
            if (!apiKey) throw new RelayError(409, "Lighter signing session expired; complete setup again");
            const registered = await client.isApiKeyRegistered(accountIndex, apiKey.apiKeyIndex, apiKey.publicKey, nodeUrl);
            if (!registered) throw new RelayError(409, "Lighter signing key is not registered; complete setup and try again");

            const terms = await getFastWithdrawalTerms({
                client,
                account,
                accountIndex,
                apiKey,
                nodeUrl,
                chain,
                ...(amountType === "gross" ? { grossAmount: requestedAmount } : { netAmount: requestedAmount }),
            });
            const withdrawalQuoteToken = seal({
                action: "withdrawQuote",
                expiresAt: Date.now() + TOKEN_TTL_MS,
                network,
                address,
                accountIndex,
                apiKeyIndex: apiKey.apiKeyIndex,
                publicKey: apiKey.publicKey,
                netAmount: terms.netAmount.toString(),
                maxFee: terms.fee.toString(),
            });
            return res.status(200).json({
                available: true,
                fee: formatUnits(terms.fee, USDC_DECIMALS),
                netAmount: formatUnits(terms.netAmount, USDC_DECIMALS),
                debitAmount: formatUnits(terms.debitAmount, USDC_DECIMALS),
                withdrawalQuoteToken,
            });
        }

        if (action === "prepareWithdrawal") {
            const quote = unseal<PreparedWithdrawalQuote>(req.body?.withdrawalQuoteToken, "withdrawQuote");
            const network = quote.network;
            const address = quote.address;
            const netAmount = BigInt(quote.netAmount);
            const maxFee = BigInt(quote.maxFee);
            const nodeUrl = resolveNodeUrl(network);
            const chain = resolveChain(network);
            const { account, accountIndex } = await resolveAccount(client, address, nodeUrl);
            if (accountIndex !== quote.accountIndex) throw new RelayError(409, "Lighter account changed; review the withdrawal and try again");
            const apiKey = getStoredApiKey(address, accountIndex);
            if (!apiKey || apiKey.apiKeyIndex !== quote.apiKeyIndex || !publicKeysEqual(apiKey.publicKey, quote.publicKey)) {
                throw new RelayError(409, "Lighter signing session expired; complete setup again");
            }
            const registered = await client.isApiKeyRegistered(accountIndex, apiKey.apiKeyIndex, apiKey.publicKey, nodeUrl);
            if (!registered) throw new RelayError(409, "Lighter signing key is not registered; complete setup and try again");
            const terms = await getFastWithdrawalTerms({ client, account, accountIndex, apiKey, nodeUrl, chain, netAmount, maxFee });

            const destinationRecipient = normalizedAddress(req.body?.destinationRecipient, "destinationRecipient");
            const nonce = await client.getNextNonce(accountIndex, apiKey.apiKeyIndex, nodeUrl);
            const signed = await signFastWithdrawalTransfer({
                nodeUrl,
                chain,
                accountIndex,
                apiKey,
                nonce,
                amount: formatUnits(netAmount, USDC_DECIMALS),
                feeBaseUnits: terms.feeBaseUnits,
                toAccountIndex: terms.info.to_account_index,
                destinationRecipient,
            });
            const withdrawalToken = seal({
                action: "withdraw",
                expiresAt: Date.now() + TOKEN_TTL_MS,
                network,
                address,
                accountIndex,
                apiKeyIndex: apiKey.apiKeyIndex,
                publicKey: apiKey.publicKey,
                txInfo: signed.txInfo,
                txHash: signed.txHash,
                message: signed.messageToSign,
                destinationRecipient,
            });
            return res.status(200).json({
                withdrawalToken,
                signPayload: { type: "message", message: signed.messageToSign },
                fee: formatUnits(terms.fee, USDC_DECIMALS),
                netAmount: formatUnits(terms.netAmount, USDC_DECIMALS),
                debitAmount: formatUnits(terms.debitAmount, USDC_DECIMALS),
            });
        }

        if (action === "withdraw") {
            const prepared = unseal<PreparedWithdrawal>(req.body?.withdrawalToken, "withdraw");
            const l1Signature = await verifyWalletSignature(prepared.address, prepared.message, req.body?.l1Signature);
            const nodeUrl = resolveNodeUrl(prepared.network);
            const chain = resolveChain(prepared.network);
            const apiKey = getStoredApiKey(prepared.address, prepared.accountIndex);
            if (!apiKey || apiKey.apiKeyIndex !== prepared.apiKeyIndex || !publicKeysEqual(apiKey.publicKey, prepared.publicKey)) {
                throw new RelayError(409, "Lighter signing session expired; complete setup again");
            }
            const registered = await client.isApiKeyRegistered(prepared.accountIndex, apiKey.apiKeyIndex, apiKey.publicKey, nodeUrl);
            if (!registered) throw new RelayError(409, "Lighter signing session expired; complete setup again");
            const auth = await createAuthToken(nodeUrl, chain, prepared.accountIndex, apiKey);
            const txInfo = attachL1Signature(prepared.txInfo, l1Signature);
            const response = await client.fastWithdraw(txInfo, prepared.destinationRecipient, nodeUrl, auth);
            if (!isLighterOk(response)) {
                return res.status(200).json({ ok: false, error: response.message });
            }
            return res.status(200).json({
                ok: true,
                txHash: verifiedTransactionHash(prepared.txHash, response.tx_hash),
            });
        }

        throw new RelayError(400, `Unsupported POST action: ${action}`);
    } catch (error) {
        // RelayError represents an expected client or availability response that
        // has already been translated for the UI; avoid noisy server stack traces.
        if (error instanceof RelayError) return res.status(error.status).json({ error: error.message });
        if (error instanceof LighterSdkNotConfiguredError || (error as Error)?.name === "LighterSdkNotConfiguredError") {
            return res.status(501).json({ error: "Lighter signing isn't set up on the server yet." });
        }
        if (error instanceof LighterApiError || (error as Error)?.name === "LighterApiError") {
            const apiError = error as LighterApiError;
            if (apiError.path.includes("/fastwithdraw/info") && /remaining withdrawal lp balance/i.test(apiError.responseBody)) {
                console.warn("[lighter/relay] fast-withdraw liquidity unavailable", {
                    status: apiError.status,
                    path: apiError.path,
                });
                return res.status(503).json({
                    error: "Lighter fast withdrawals are temporarily unavailable because its Arbitrum bridge liquidity pool is unavailable. No funds were moved; please try again later.",
                });
            }
            console.error("[lighter/relay] upstream API error", error);
            return res.status(502).json({ error: apiError.message });
        }
        console.error("[lighter/relay] unexpected error", error);
        if (process.env.NODE_ENV !== "production" && error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lighter relay error" });
    }
}
