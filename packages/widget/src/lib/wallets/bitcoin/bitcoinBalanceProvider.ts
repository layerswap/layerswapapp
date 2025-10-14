import { TokenBalance } from "@/Models/Balance";
import { NetworkWithTokens } from "@/Models/Network";
import KnownInternalNames from "../../knownIds";
import axios from "axios";
import { BalanceProvider } from "@/types/balance";

interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}

export class BitcoinBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        let balances: TokenBalance[] = []
        const token = network.tokens.find(t => t.symbol == 'BTC')

        if (!token) return

        try {
            const { retry } = await import("@/lib/retry")
            const utxos = await retry(
                async () => await fetchUtxos(address, network.name, options?.timeoutMs),
                options?.retryCount ?? 3,
                500
            )
            const balanceSats = sumUtxos(utxos)
            const formattedBalance = formatBtc(balanceSats)

            if (!token) throw new Error(`Token not found for network ${network.name}`)

            const balanceObj: TokenBalance = {
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
            balances.push(this.resolveTokenBalanceFetchError(e, token, network, true))
        }

        return balances
    }
}

async function fetchUtxos(address: string, networkName: string, timeoutMs?: number): Promise<Utxo[]> {
    const url = `https://mempool.space${networkName.toLowerCase().includes('testnet') ? '/testnet' : ''}/api/address/${address}/utxo`;
    const utxosData = await axios.get<Utxo[]>(url, { timeout: timeoutMs ?? 60000 })
    const utxos = utxosData.data;
    return utxos

}

function sumUtxos(utxos: Utxo[]): number {
    return utxos.reduce((sum, u) => sum + u.value, 0)
}

function formatBtc(sats: number): number {
    return Number((sats / 1e8).toFixed(8))
}