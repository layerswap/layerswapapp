import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { insertIfNotExists } from "./helpers";

export class ImmutableXBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet.includes(network.name) || KnownInternalNames.Networks.ImmutableXGoerli.includes(network.name))
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const axios = (await import("axios")).default

        if (!network?.tokens && !network.token) return
        try {
            const res: BalancesResponse = await axios.get(`${network?.node_url}/v2/balances/${address}`).then(r => r.data)
            const tokens = insertIfNotExists(network.tokens || [], network.token)

            const balances = tokens?.map(asset => {
                const balance = res.result.find(r => r.symbol === asset.symbol)
                if (balance?.balance === undefined) {
                    return {
                        network: network.name,
                        amount: undefined,
                        decimals: asset.decimals,
                        isNativeCurrency: false,
                        token: asset.symbol,
                        request_time: new Date().toJSON(),
                        error: `Could not fetch balance for ${asset.symbol}`
                    }
                }
                return {
                    network: network.name,
                    amount: formatAmount(balance?.balance, asset.decimals),
                    decimals: asset.decimals,
                    isNativeCurrency: false,
                    token: asset.symbol,
                    request_time: new Date().toJSON(),
                }
            })

            return balances
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
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