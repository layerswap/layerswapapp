import { bitcoin, createClient, getBalance, http, rpcSchema, UTXOSchema } from "@bigmi/core";
import { Balance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class BitcoinBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        let balances: Balance[] = []

        if (!network?.tokens) return

        try {
            const publicClient = createClient({
                chain: bitcoin,
                rpcSchema: rpcSchema<UTXOSchema>(),
                transport: http(network.node_url),
            })
            const token = network.tokens.find(t => t.symbol == 'BTC')
            try {
                const balance = await getBalance(publicClient, { address });

                if (!token) throw new Error(`Token not found for network ${network.name}`)

                const balanceObj: Balance = {
                    network: network.name,
                    amount: formatAmount(Number(balance || 0), token.decimals),
                    decimals: token.decimals,
                    isNativeCurrency: network.token?.symbol === token.symbol,
                    token: token.symbol,
                    request_time: new Date().toJSON()
                }
                balances.push(balanceObj)
            }
            catch (e) {
                balances.push({
                    network: network.name,
                    amount: 0,
                    decimals: token?.decimals || 0,
                    isNativeCurrency: network.token?.symbol === 'BTC',
                    token: token?.symbol || 'BTC',
                    request_time: new Date().toJSON()
                })
                console.log(e)
            }


        } catch (e) {
            console.log(e)
        }

        return balances
    }
}