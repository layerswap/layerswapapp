import { Balance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import axios from "axios";

interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}

export class BitcoinBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        let balances: Balance[] = []

        if (!network?.tokens) return

        try {

            const token = network.tokens.find(t => t.symbol == 'BTC')
            try {

                const utxos = await fetchUtxos(address, network.name)
                const balanceSats = sumUtxos(utxos)
                const formattedBalance = formatBtc(balanceSats)

                if (!token) throw new Error(`Token not found for network ${network.name}`)

                const balanceObj: Balance = {
                    network: network.name,
                    amount: formattedBalance,
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

async function fetchUtxos(address: string, networkName: string): Promise<Utxo[]> {
    const url = `https://mempool.space${networkName.toLowerCase().includes('testnet') ? '/testnet' : ''}/api/address/${address}/utxo`;
    const utxosData = await axios.get<Utxo[]>(url)
    const utxos = utxosData.data;
    return utxos

}

function sumUtxos(utxos: Utxo[]): number {
    return utxos.reduce((sum, u) => sum + u.value, 0)
}

function formatBtc(sats: number): number {
    return Number((sats / 1e8).toFixed(8))
}