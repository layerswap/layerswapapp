import { Balance, BalanceProps, BalanceProvider } from "../../../Models/Balance"
import { useQueryState } from "../../../context/query"
import { useSettingsState } from "../../../context/settings"

export default function useQueryBalances(): BalanceProvider {

    const query = useQueryState()
    const { networks: layers } = useSettingsState()
    const supportedNetworks = [(layers.find(l => l.name.toLowerCase() === query.from?.toLowerCase())?.name || ''), (layers.find(l => l.name.toLowerCase() === query.to?.toLowerCase())?.name || '')]

    const getBalance = ({ network: layer }: BalanceProps) => {
        const asset = layer.tokens.find(a => a.symbol === query.fromAsset)

        const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
        const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries)

        if (!parsedBalances || !asset) return

        const balances = [{
            network: layer.name,
            amount: parsedBalances[asset.symbol],
            decimals: asset.decimals,
            isNativeCurrency: asset.is_native,
            token: asset.symbol,
            request_time: new Date().toJSON(),
        }]

        return balances

    }

    return {
        getBalance,
        supportedNetworks
    }

}