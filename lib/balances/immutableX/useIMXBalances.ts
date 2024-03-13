import KnownInternalNames from "../../knownIds"
import formatAmount from "../../formatAmount";
import { BalanceProps, BalanceProvider, GasProps } from "../../../Models/Balance";

export default function useImxBalance(): BalanceProvider {

    const supportedNetworks = [
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli
    ]

    const getBalance = async ({ layer, address }: BalanceProps) => {

        const axios = (await import("axios")).default

        if (!layer.tokens) return

        const res: BalancesResponse = await axios.get(`${layer?.node_url}/v2/balances/${address}`).then(r => r.data)

        const balances = layer?.tokens?.map(asset => {
            const balance = res.result.find(r => r.symbol === asset.symbol)

            return {
                network: layer.name,
                amount: formatAmount(balance?.balance, asset.decimals),
                decimals: asset.decimals,
                isNativeCurrency: false,
                token: asset.symbol,
                request_time: new Date().toJSON(),
            }
        })

        return balances

    }

    return {
        getBalance,
        supportedNetworks
    }
}

type BalancesResponse = {
    result: {
        balance: string,
        symbol: string,
        token_address: string
    }[]
}