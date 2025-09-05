import { BalanceFetchError, TokenBalance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import retryWithExponentialBackoff from "../../retry";

export class FuelBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const balances: TokenBalance[] = [];
        const errors: BalanceFetchError[] = [];

        if (!network?.tokens) return

        const BALANCES_QUERY = `query Balances($filter: BalanceFilterInput) {
            balances(filter: $filter, first: 5) {
              nodes {
                amount
                assetId
              }
            }
          }`;

        const BALANCES_ARGS = {
            filter: {
                owner: address,
            },
        };

        try {
            const response = await retryWithExponentialBackoff(async () => await fetch(network.node_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query: BALANCES_QUERY,
                    variables: BALANCES_ARGS,
                }),
            }));
            const json: {
                data: {
                    balances: {
                        nodes: {
                            amount: string,
                            assetId: string
                        }[]
                    }
                }
            } = await response.json();

            for (const token of network.tokens) {
                try {
                    const balance = json.data.balances.nodes.find(b => b?.assetId === token.contract) || null

                    balances.push({
                        network: network.name,
                        amount: formatAmount(Number(balance?.amount || 0), token.decimals),
                        decimals: token.decimals,
                        isNativeCurrency: network.token?.symbol === token.symbol,
                        token: token.symbol,
                        request_time: new Date().toJSON(),
                    });
                } catch (e: any) {
                    errors.push({
                        network: network.name,
                        token: token?.symbol,
                        message: e?.message ?? "Failed to parse/format token balance",
                        code: e?.code,
                        cause: e,
                    });
                }
            }
        } catch (e) {
            console.log(e)
            throw e
        }

        return { balances, errors };
    }
}