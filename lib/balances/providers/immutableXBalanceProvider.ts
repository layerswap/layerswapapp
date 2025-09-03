import { BalanceFetchError, TokenBalance } from "@/Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { insertIfNotExists } from "./helpers";

export class ImmutableXBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet.includes(network.name) || KnownInternalNames.Networks.ImmutableXGoerli.includes(network.name))
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const balances: TokenBalance[] = [];
        const errors: BalanceFetchError[] = [];

        const axios = (await import("axios")).default

        if (!network?.tokens && !network.token) return

        const res: BalancesResponse = await axios.get(`${network?.node_url}/v2/balances/${address}`).then(r => r.data)
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        for (const asset of tokens) {
            try {
                const balance = res.result.find(r => r.symbol === asset.symbol)

                balances.push({
                    network: network.name,
                    amount: formatAmount(balance?.balance, asset.decimals),
                    decimals: Number(asset.decimals),
                    isNativeCurrency: false,
                    token: asset.symbol,
                    request_time: new Date().toJSON(),
                });
            } catch (e: any) {
                errors.push({
                    network: network.name,
                    token: asset?.symbol ?? null,
                    message: e?.message ?? "Failed to parse immutableX balance",
                    code: e?.code ?? e?.response?.status,
                    cause: e,
                });
            }
        }

        return { balances, errors };
    }
}

type BalancesResponse = {
    result: {
        balance: string,
        symbol: string,
        token_address: string
    }[]
}