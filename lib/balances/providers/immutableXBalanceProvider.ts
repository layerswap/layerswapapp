import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { insertIfNotExists } from "../helpers";

export class ImmutableXBalanceProvider extends BalanceProvider {
    supportsNetwork = (network: NetworkWithTokens): boolean => {
        return (KnownInternalNames.Networks.ImmutableXMainnet.includes(network.name) || KnownInternalNames.Networks.ImmutableXGoerli.includes(network.name))
    }

    fetchBalance = async (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number }) => {
        const axios = (await import("axios")).default

        if (!network?.tokens && !network.token) return
        try {
            const res: BalancesResponse = await axios.get(`${network?.node_url}/v2/balances/${address}`, { timeout: options?.timeoutMs ?? 60000 }).then(r => r.data)
            const tokens = insertIfNotExists(network.tokens || [], network.token)

            const balances = tokens?.map(asset => {
                const balance = res.result.find(r => r.symbol === asset.symbol)
                return {
                    network: network.name,
                    amount: balance?.balance ? formatAmount(balance?.balance, asset.decimals) : 0,
                    decimals: asset.decimals,
                    isNativeCurrency: false,
                    token: asset.symbol,
                    request_time: new Date().toJSON(),
                }
            })

            return balances
        }
        catch (e) {
            return network.tokens.map((currency) => (this.resolveTokenBalanceFetchError(e, currency, network)))
        }
    }
}

type BalancesResponse = {
    result: {
        balance: string,
        symbol: string,
        token_address: string
    }[]
}