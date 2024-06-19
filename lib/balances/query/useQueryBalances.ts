import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance"
import { useQueryState } from "../../../context/query"
import { useSettingsState } from "../../../context/settings"

export default function useQueryBalances(): BalanceProvider {

    const query = useQueryState()
    const { networks } = useSettingsState()
    const supportedNetworks = [(networks.find(l => l.name.toLowerCase() === query.from?.toLowerCase())?.name || ''), (networks.find(l => l.name.toLowerCase() === query.to?.toLowerCase())?.name || '')]

    const getNetworkBalances = ({ networkName }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === networkName)

        const asset = network?.tokens?.find(a => a.symbol === query.fromAsset)

        const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
        const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries)

        if (!parsedBalances || !asset || !network) return

        const balances = [{
            network: network.name,
            amount: parsedBalances[asset.symbol],
            decimals: asset.decimals,
            isNativeCurrency: network.token?.symbol === asset.symbol,
            token: asset.symbol,
            request_time: new Date().toJSON(),
        }]

        return balances

    }


    const getBalance = ({ network, token }: BalanceProps) => {

        const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
        const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries)

        if (!parsedBalances || !token) return

        return {
            network: network.name,
            amount: parsedBalances[token.symbol],
            decimals: token.decimals,
            isNativeCurrency: network.token?.symbol === token.symbol,
            token: token.symbol,
            request_time: new Date().toJSON(),
        }

    }

    return {
        getNetworkBalances,
        getBalance,
        supportedNetworks
    }
}