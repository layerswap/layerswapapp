import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../Models/Balance";
import ZkSyncLiteRPCClient from "./zksyncLiteRpcClient";

export default function useZkSyncBalance(): BalanceProvider {
    const supportedNetworks = [
        KnownInternalNames.Networks.ZksyncMainnet
    ]
    const client = new ZkSyncLiteRPCClient();
    const getBalance = async ({ network: layer, address }: BalanceProps) => {
        let balances: Balance[] = []

        if (!layer.tokens) return

        try {
            const result = await client.getAccountInfo(layer.node_url, address);
            const zkSyncBalances = layer.tokens.map((a) => {
                const currency = layer?.tokens?.find(c => c?.symbol == a.symbol);
                const amount = currency && result.committed.balances[currency.symbol];

                return ({
                    network: layer.name,
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

    const getGas = async ({ network: layer, currency, address }: GasProps) => {

        let gas: Gas[] = [];
        if (!layer.tokens || !address) return

        try {
            const result = await client.getTransferFee(layer.node_url, address, currency.symbol);
            const currencyDec = layer?.tokens?.find(c => c?.symbol == currency.symbol)?.decimals;
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