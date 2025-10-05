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

export class HyperliquidClient {
    async getClearinghouseState(user: string, nodeUrl: string, timeoutMs?: number): Promise<ClearinghouseState> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout");
        const response = await fetchWithTimeout(`${nodeUrl}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'clearinghouseState',
                user: user,
            }),
            timeoutMs: timeoutMs ?? 60000,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}