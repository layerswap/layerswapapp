import { useQueryState } from "../../../context/query"
import { useSettingsState } from "../../../context/settings"
import { WalletProvider } from "../../../hooks/useWallet"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"

export default function useQueryWallet(): WalletProvider {

    const query = useQueryState()
    const { layers } = useSettingsState()
    const supportedNetworks = [(layers.find(l => l.internal_name.toLowerCase() === query.from?.toLowerCase())?.internal_name || ''), (layers.find(l => l.internal_name.toLowerCase() === query.to?.toLowerCase())?.internal_name || '')]
    const name = 'query'

    const getWallet = () => {
        const account = query.account
        if (account) {
            return {
                address: account,
                connector: name,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: name, address: account })
            }
        }
    }

    return {
        getConnectedWallet: getWallet,
        withdrawalSupportedNetworks: supportedNetworks,
        autofillSupportedNetworks: supportedNetworks,
        name
    }

}