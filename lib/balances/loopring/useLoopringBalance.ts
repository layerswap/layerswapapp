import { Layer } from "../../../Models/Layer"
import { Balance, BalanceProvider } from "../../../hooks/useBalance"
import { Currency } from "../../../Models/Currency"
import KnownInternalNames from "../../knownIds"
import formatAmount from "../../formatAmount";
import { createPublicClient, http } from 'viem'
import { LoopringAPI } from "../../loopring/LoopringAPI";

export default function useLoopringBalance(): BalanceProvider {
    const name = 'loopring'
    const supportedNetworks = [
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringGoerli
    ]

    const getBalance = async (layer: Layer, address: string) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return
        try {
            const { accInfo } = await LoopringAPI.exchangeAPI.getAccount({
                owner: address,
            });

            const tokens = layer?.assets?.map(obj => obj.contract_address).join(',');
            const result = await LoopringAPI.userAPI.getUserBalances({ accountId: accInfo.accountId, tokens: tokens }, "") as any

            const loopringBalances = layer?.assets.filter(a => a.status !== 'inactive').map(asset => {
                const amount = result.raw_data.find(d => d.tokenId == asset.contract_address)?.total
                return ({
                    network: layer.internal_name,
                    token: asset?.asset,
                    amount: amount ? formatAmount(amount, Number(asset?.decimals)) : 0,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: asset?.asset == "ETH" ? true : false
                })
            });

            balances = [
                ...loopringBalances,
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