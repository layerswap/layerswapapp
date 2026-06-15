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

export type HyperliquidSignature = { r: string; s: string; v: number };

export type HyperliquidWithdrawResponse = { status: 'ok' } | { status: 'err'; response: string };

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
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout");
        const { retry } = await import("@/lib/retry")
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
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout");
        const { retry } = await import("@/lib/retry")
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

    async getAvailableTokenBalance(user: string, nodeUrl: string, coin: string, timeoutMs?: number, retryCount?: number): Promise<HyperliquidTokenBalance> {
        // Hyperliquid documents spotClearinghouseState as the balance source of
        // truth for unified and portfolio margin accounts.
        const spotState = await this.getSpotClearinghouseState(user, nodeUrl, timeoutMs, retryCount)
        return getAvailableTokenBalance(spotState, coin)
    }

    /**
     * Submit a signed `sendToEvmWithData` action to Hyperliquid's exchange endpoint.
     * Deliberately NOT wrapped in `retry`: the action carries a time-bound nonce
     * and is signed, so a blind retry risks a double-submit.
     */
    async withdraw(action: HyperliquidSendToEvmAction, signature: HyperliquidSignature, nodeUrl: string, timeoutMs?: number): Promise<HyperliquidWithdrawResponse> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout");
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
