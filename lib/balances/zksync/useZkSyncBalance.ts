import { Layer } from "../../../Models/Layer"
import { Balance, BalanceProvider } from "../../../hooks/useBalance"
import { Currency } from "../../../Models/Currency"
import KnownInternalNames from "../../knownIds"
import formatAmount from "../../formatAmount";
import { createPublicClient, http } from 'viem'

export default function useZkSyncBalance(): BalanceProvider {
    const name = 'zksync_lite'
    const supportedNetworks = [
        KnownInternalNames.Networks.ZksyncMainnet
    ]

    const getBalance = async (layer: Layer, address: string) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return
        const provider = createPublicClient({
            transport: http(`${layer.assets[0].network?.nodes[0].url!}jsrpc`)
        })

        try {
            const result: any = await provider.request({ method: 'account_info' as any, params: [address as `0x${string}`] })
            const zkSyncBalances = Object.entries(result?.verified.balances).map(([token, amount]) => {
                const currency = layer?.assets?.find(c => c?.asset == token);
                return ({
                    network: "ZKSYNC_MAINNET",
                    token,
                    amount: formatAmount(amount, Number(currency?.decimals)),
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: token == "ETH" ? true : false
                })
            });

            balances = [
                ...zkSyncBalances,
            ]
        }
        catch (e) {
            console.log(e)
        }

        return balances
    }

    const getGas = async (layer: Layer, address: string, currency: Currency, userDestinationAddress: string) => {

        if (layer.isExchange === true || !layer.assets) return

        const provider = createPublicClient({
            transport: http(`${layer.assets[0].network?.nodes[0].url!}jsrpc`)
        })

        const result: any = await provider.request({ method: 'get_tx_fee' as any, params: ["Transfer" as any, address as `0x${string}`, currency.asset as any] })
        const currencyDec = layer?.assets?.find(c => c?.asset == currency.asset)?.decimals;
        const gas = formatAmount(result.totalFee, Number(currencyDec))

        return [{
            token: currency.asset,
            gas: gas,
            request_time: new Date().toJSON()
        }]
    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}