import { Balance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import ZkSyncLiteRPCClient from "../../balances/zksync/zksyncLiteRpcClient";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class ZkSyncBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const client = new ZkSyncLiteRPCClient();

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
}