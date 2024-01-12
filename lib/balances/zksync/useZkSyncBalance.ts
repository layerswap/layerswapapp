import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../Models/Balance";
import ZkSyncLiteRPCClient from "./zksyncLiteRpcClient";

export default function useZkSyncBalance(): BalanceProvider {
    const name = 'zksync_lite'
    const supportedNetworks = [
        KnownInternalNames.Networks.ZksyncMainnet
    ]
    const client = new ZkSyncLiteRPCClient();
    const getBalance = async ({ layer, address }: BalanceProps) => {
        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return

        try {
            const result = await client.getAccountInfo(layer.nodes[0].url, address);
            const zkSyncBalances = layer.assets.map((a) => {
                const currency = layer?.assets?.find(c => c?.asset == a.asset);
                const amount = currency && result.committed.balances[currency.asset];

                return ({
                    network: layer.internal_name,
                    token: a.asset,
                    amount: formatAmount(amount, Number(currency?.decimals)),
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: false
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

    const getGas = async ({ layer, currency, address }: GasProps) => {

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets || !address) return

        try {
            const result = await client.getTransferFee(layer.nodes[0].url, address, currency.asset);
            const currencyDec = layer?.assets?.find(c => c?.asset == currency.asset)?.decimals;
            const formatedGas = formatAmount(result.totalFee, Number(currencyDec))

            gas = [{
                token: currency.asset,
                gas: formatedGas,
                request_time: new Date().toJSON()
            }]
        }
        catch (e) {
            console.log(e)
        }

        return gas
    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}