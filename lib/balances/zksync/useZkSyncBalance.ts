import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../Models/Balance";
import ZkSyncLiteRPCClient from "./zksyncLiteRpcClient";

export default function useZkSyncBalance(): BalanceProvider {
    const supportedNetworks = [
        KnownInternalNames.Networks.ZksyncMainnet
    ]
    const client = new ZkSyncLiteRPCClient();
    const getBalance = async ({ layer, address }: BalanceProps) => {
        let balances: Balance[] = []

        if (!layer.assets) return

        try {
            const result = await client.getAccountInfo(layer.nodes[0].url, address);
            const zkSyncBalances = layer.assets.map((a) => {
                const currency = layer?.assets?.find(c => c?.symbol == a.symbol);
                const amount = currency && result.committed.balances[currency.symbol];

                return ({
                    network: layer.internal_name,
                    token: a.symbol,
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
        if (!layer.assets || !address) return

        try {
            const result = await client.getTransferFee(layer.nodes[0].url, address, currency.symbol);
            const currencyDec = layer?.assets?.find(c => c?.symbol == currency.symbol)?.decimals;
            const formatedGas = formatAmount(result.totalFee, Number(currencyDec))

            gas = [{
                token: currency.symbol,
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
        supportedNetworks
    }
}