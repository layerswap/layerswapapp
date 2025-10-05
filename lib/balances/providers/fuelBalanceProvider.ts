import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import retryWithExponentialBackoff from "../../retry";
import fetchWithTimeout from "@/lib/fetchWithTimeout";

export class FuelBalanceProvider extends BalanceProvider {
    supportsNetwork = (network: NetworkWithTokens): boolean => {
        return KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number }) => {
        let balances: TokenBalance[] = []

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
            const response = await retryWithExponentialBackoff(async () => await fetchWithTimeout(network.node_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query: BALANCES_QUERY,
                    variables: BALANCES_ARGS,
                }),
                timeoutMs: options?.timeoutMs ?? 60000,
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

            for (let i = 0; i < network.tokens.length; i++) {

                const token = network.tokens[i]
                const balance = json.data.balances.nodes.find(b => b?.assetId === token.contract) || null

                const balanceObj: TokenBalance = {
                    network: network.name,
                    amount: balance?.amount ? formatAmount(Number(balance?.amount), token.decimals) : undefined,
                    decimals: token.decimals,
                    isNativeCurrency: network.token?.symbol === token.symbol,
                    token: token.symbol,
                    request_time: new Date().toJSON(),
                    error: balance?.amount === undefined ? `Could not fetch balance for ${token.symbol}` : undefined
                }

                balances.push(balanceObj)

            }

        } catch (e) {
            return network.tokens.map((currency) => (this.resolveTokenBalanceFetchError(e, currency, network)))
        }

        return balances
    }
}