import { fetchWithTimeout, retry } from "@layerswap/utils";

interface ClearinghouseState {
    assetPositions: {
        position: {
            coin: string;
            cumFunding: {
                allTime: string;
                sinceChange: string;
                sinceOpen: string;
            };
            entryPx: string;
            leverage: {
                type: string;
                value: number;
                rawUsd: string;
            };
            liquidationPx: string | null;
            marginUsed: string;
            maxLeverage: number;
            notionalPosition: string;
            returnOnEquity: string;
            szi: string;
            unrealizedPnl: string;
        };
        type: string;
    }[];
    crossMaintenanceMarginUsed: string;
    crossMarginSummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    marginsummary: {
        accountValue: string;
        totalMarginUsed: string;
        totalNtlPos: string;
        totalRawUsd: string;
    };
    time: number;
    withdrawable: string;
}

interface SpotClearinghouseState {
    balances: {
        coin: string;
        token: number;
        hold: string;
        total: string;
        entryNtl: string;
    }[];
}

export type HyperliquidTokenBalance = {
    coin: string;
    total: number;
    hold: number;
    available: number;
}

/**
 * Hyperliquid `sendToEvmWithData` action — withdraws USDC from HyperCore through
 * HyperEVM, burning it via Circle CCTP and auto-minting + forwarding it to the
 * recipient on the destination chain (when `data === '0x'`). Replaces the legacy
 * `withdraw3` Arbitrum-bridge action (bridge being deprecated by Hyperliquid).
 * See https://developers.circle.com/cctp/howtos/withdraw-usdc-from-hypercore-to-evm
 */
export type HyperliquidSendToEvmAction = {
    type: 'sendToEvmWithData';
    hyperliquidChain: 'Mainnet' | 'Testnet';
    /** Destination chain's EVM chain id, hex (e.g. '0x2105' = Base). */
    signatureChainId: `0x${string}`;
    /** HyperCore-native token name, e.g. 'USDC'. */
    token: string;
    /** Plain decimal amount that leaves HyperCore. */
    amount: string;
    /** Source balance: 'spot' for the spot dex, '' for perp. */
    sourceDex: string;
    /** Recipient address on the destination chain. */
    destinationRecipient: string;
    /** 'hex' for EVM, 'base58' for Solana. */
    addressEncoding: string;
    /** Circle's wire field name carrying the CCTP destination domain (e.g. 6 = Base).
     * Keep this name — it's what Hyperliquid expects; our config calls it `destinationCctpDomain`. */
    destinationChainId: number;
    /** Gas limit for the destination forwarding transaction. */
    gasLimit: number;
    /** Hook data; '0x' triggers CCTP auto-forward to the recipient. */
    data: string;
    /** Nonce, in ms; Hyperliquid requires `nonce === action.nonce`. */
    nonce: number;
};

/**
 * Hyperliquid `usdClassTransfer` action — moves USDC between the user's perp and
 * spot balances on HyperCore (internal, no CCTP). `toPerp: true` = spot→perp,
 * `false` = perp→spot. Used to consolidate funds into one pool when neither pool
 * alone covers a withdrawal but the combined balance does.
 */
export type HyperliquidUsdClassTransferAction = {
    type: 'usdClassTransfer';
    hyperliquidChain: 'Mainnet' | 'Testnet';
    /** Hex chain id the typed data is signed against — must match the wallet's chain. */
    signatureChainId: `0x${string}`;
    /** Plain decimal USDC amount to move. */
    amount: string;
    /** true = spot→perp, false = perp→spot. */
    toPerp: boolean;
    /** Nonce, in ms; Hyperliquid requires `nonce === action.nonce`. */
    nonce: number;
};

export type HyperliquidSignature = { r: string; s: string; v: number };

export type HyperliquidWithdrawResponse = { status: 'ok' } | { status: 'err'; response: string };

/** Free, withdrawable USDC split across the two HyperCore pools. */
export type WithdrawableSplit = {
    /** Spot available = total - hold, floored at 0. */
    spot: number;
    /** Perps `withdrawable` (free USDC after margin), floored at 0. */
    perps: number;
    /** spot + perps. */
    combined: number;
};

const parseBalanceAmount = (value: string | undefined): number => {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount : 0
}

export const getAvailableTokenBalance = (state: SpotClearinghouseState, coin: string): HyperliquidTokenBalance => {
    const balance = state.balances.find(b => b.coin.toUpperCase() === coin.toUpperCase())
    const total = parseBalanceAmount(balance?.total)
    const hold = parseBalanceAmount(balance?.hold)
    const available = Math.max(total - hold, 0)

    return {
        coin,
        total,
        hold,
        available,
    }
}

export class HyperliquidClient {
    async getClearinghouseState(user: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<ClearinghouseState> {
        const response = await retry(async () => await fetchWithTimeout(`${nodeUrl}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: user,
            }),
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async getSpotClearinghouseState(user: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<SpotClearinghouseState> {
        const response = await retry(async () => await fetchWithTimeout(`${nodeUrl}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'spotClearinghouseState',
                user: user,
            }),
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Free, withdrawable USDC split across both HyperCore pools. The `sendToEvmWithData`
     * withdrawal can pull from either (spot or perp) via `sourceDex`, so the caller needs
     * the split to pick a pool — or consolidate via `usdClassTransfer` when neither alone
     * covers the amount. Fetches both clearinghouse states concurrently; either failing
     * rejects the whole split (we can't decide a source on partial data).
     */
    async getWithdrawableSplit(user: string, nodeUrl: string, coin: string, timeoutMs?: number, retryCount?: number): Promise<WithdrawableSplit> {
        const [spotState, perpsState] = await Promise.all([
            this.getSpotClearinghouseState(user, nodeUrl, timeoutMs, retryCount),
            this.getClearinghouseState(user, nodeUrl, timeoutMs, retryCount),
        ])
        const spot = getAvailableTokenBalance(spotState, coin).available
        // `withdrawable` is the free USDC after margin — the correct field, not
        // accountValue/totalRawUsd (which include margin-locked equity).
        const perps = Math.max(parseBalanceAmount(perpsState.withdrawable), 0)
        return { spot, perps, combined: spot + perps }
    }

    /**
     * Submit a signed `sendToEvmWithData` action to Hyperliquid's exchange endpoint.
     * Deliberately NOT wrapped in `retry`: the action carries a time-bound nonce
     * and is signed, so a blind retry risks a double-submit.
     */
    async withdraw(action: HyperliquidSendToEvmAction, signature: HyperliquidSignature, nodeUrl: string, timeoutMs?: number): Promise<HyperliquidWithdrawResponse> {
        const response = await fetchWithTimeout(`${nodeUrl}/exchange`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, nonce: action.nonce, signature }),
            timeoutMs: timeoutMs ?? 60000,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Submit a signed `usdClassTransfer` action to move USDC between the user's
     * perp and spot pools. Like `withdraw`, deliberately NOT wrapped in `retry`:
     * the action carries a time-bound nonce and is signed, so a blind retry risks
     * a double-submit.
     */
    async usdClassTransfer(action: HyperliquidUsdClassTransferAction, signature: HyperliquidSignature, nodeUrl: string, timeoutMs?: number): Promise<HyperliquidWithdrawResponse> {
        const response = await fetchWithTimeout(`${nodeUrl}/exchange`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, nonce: action.nonce, signature }),
            timeoutMs: timeoutMs ?? 60000,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}
