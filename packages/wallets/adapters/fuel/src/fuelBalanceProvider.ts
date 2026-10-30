import { retryWithExponentialBackoff, fetchWithTimeout, KnownInternalNames, formatUnits } from "@layerswap/utils";
import { BalanceProvider, TokenBalance } from "@layerswap/widget-types";

type FuelBalancePage = {
    data?: {
        balances?: {
            nodes: { amount: string; assetId: string }[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
    };
    errors?: { message: string }[];
};

const BALANCES_QUERY = `query Balances($filter: BalanceFilterInput, $after: String) {
    balances(filter: $filter, first: 100, after: $after) {
        nodes {
            amount
            assetId
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}`;

export class FuelBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network?.tokens) {
            return
        }

        const amountsByAsset = new Map<string, bigint>()
        const visitedCursors = new Set<string>()
        let after: string | null = null

        // An absent asset means zero only after every page succeeded. Do not
        // turn a partial response or a failed request into a zero balance.
        while (true) {
            const page = await retryWithExponentialBackoff(async (): Promise<FuelBalancePage> => {
                const response = await fetchWithTimeout(network.node_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        query: BALANCES_QUERY,
                        variables: { filter: { owner: address }, after },
                    }),
                    timeoutMs: options?.timeoutMs ?? 60000,
                })

                if (!response.ok) {
                    throw new Error(`Fuel balance request failed (HTTP ${response.status})`)
                }

                const result: FuelBalancePage = await response.json()
                if (result.errors?.length) {
                    throw new Error(result.errors.map(error => error.message).join('; '))
                }
                return result
            }, options?.retryCount ?? 3)

            const balances = page.data?.balances
            if (!balances || !Array.isArray(balances.nodes)
                || typeof balances.pageInfo?.hasNextPage !== 'boolean') {
                throw new Error('Invalid Fuel balance response')
            }

            for (const balance of balances.nodes) {
                if (typeof balance?.assetId !== 'string'
                    || typeof balance.amount !== 'string' || !/^\d+$/.test(balance.amount)) {
                    throw new Error('Invalid Fuel asset balance')
                }
                amountsByAsset.set(balance.assetId.toLowerCase(), BigInt(balance.amount))
            }

            if (!balances.pageInfo.hasNextPage) {
                break
            }

            const cursor = balances.pageInfo.endCursor
            if (!cursor || visitedCursors.has(cursor)) {
                throw new Error('Invalid Fuel balance pagination cursor')
            }
            visitedCursors.add(cursor)
            after = cursor
        }

        const requestTime = new Date().toJSON()
        return network.tokens.map((token): TokenBalance => {
            const assetId = token.contract?.toLowerCase()
            const amount = assetId ? amountsByAsset.get(assetId) ?? 0n : undefined
            return {
                network: network.name,
                amount: amount === undefined ? undefined : Number(formatUnits(amount, token.decimals)),
                decimals: token.decimals,
                isNativeCurrency: network.token?.symbol === token.symbol,
                token: token.symbol,
                request_time: requestTime,
            }
        })
    }
}
