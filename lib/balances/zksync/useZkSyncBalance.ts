import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps, NetworkBalancesProps } from "../../../Models/Balance";
import ZkSyncLiteRPCClient from "./zksyncLiteRpcClient";
import { useSettingsState } from "../../../context/settings";

export default function useZkSyncBalance(): BalanceProvider {
    const { networks } = useSettingsState()

    const supportedNetworks = [
        KnownInternalNames.Networks.ZksyncMainnet
    ]
    const client = new ZkSyncLiteRPCClient();

    const getNetworkBalances = async ({ networkName, address }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === networkName)

        let balances: Balance[] = []

        if (!network?.tokens) return

        try {
            const result = await client.getAccountInfo(network.node_url, address);
            const zkSyncBalances = network.tokens.map((a) => {
                const currency = network?.tokens?.find(c => c?.symbol == a.symbol);
                const amount = currency && result.committed.balances[currency.symbol];

                return ({
                    network: network.name,
                    token: a.symbol,
                    amount: formatAmount(amount, Number(currency?.decimals)),
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: true
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


    const getBalance = async ({ network, token, address }: BalanceProps) => {

        try {
            const result = await client.getAccountInfo(network.node_url, address);
            const amount = result.committed.balances[token.symbol];

            return ({
                network: network.name,
                token: token.symbol,
                amount: formatAmount(amount, Number(token?.decimals)),
                request_time: new Date().toJSON(),
                decimals: Number(token?.decimals),
                isNativeCurrency: true
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const getGas = async ({ network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        let gas: Gas[] = [];

        try {
            const result = await client.getTransferFee(network.node_url, recipientAddress as `0x${string}`, token.symbol);
            const currencyDec = token.decimals;
            const formatedGas = formatAmount(Number(result.totalFee) * 1.5, Number(currencyDec))

            gas = [{
                token: token.symbol,
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
        getNetworkBalances,
        getBalance,
        getGas,
        supportedNetworks
    }
}