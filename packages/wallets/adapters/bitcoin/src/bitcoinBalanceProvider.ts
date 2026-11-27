import { TokenBalance, BalanceProvider, NetworkType } from "@layerswap/widget-types";
import { retry, AppSettings } from "@layerswap/utils";
import axios from "axios";

interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}

export class BitcoinBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.type === NetworkType.Bitcoin
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        let balances: TokenBalance[] = []
        const token = network.tokens.find(t => t.symbol == 'BTC')

        if (!token) return

        try {
            const utxos = await retry(
                async () => await fetchUtxos(address, options?.timeoutMs),
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

async function fetchUtxos(address: string, timeoutMs?: number): Promise<Utxo[]> {
    const url = `https://mempool.space${AppSettings.isTestnet() ? '/testnet' : ''}/api/address/${address}/utxo`;
    //TODO: use fetch and unisntall axios
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
