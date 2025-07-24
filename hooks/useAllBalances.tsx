import useWallet from "./useWallet"
import { useSettingsState } from "../context/settings"
import { useBalanceStore } from "../stores/balanceStore"
import { SwapDirection } from "../components/DTOs/SwapFormValues"
import { useEffect, useMemo } from "react"
import { NetworkWithTokens } from "../Models/Network"

type Props = {
    direction: SwapDirection
}
export default function useAllBalances({ direction }: Props) {
    const wallets = useWallet().wallets
    const networks = useSettingsState().networks
    const walletAddresses = useMemo(() => wallets.map(w => w.address).join(":"), [wallets])
    const activeWallets = useMemo(() => wallets.filter(w => w.isActive), [walletAddresses])

    const walletNetworks = useMemo(() => {
        return activeWallets.map(wallet => {
            const sourceNetworks = wallet.asSourceSupportedNetworks
            const withdrawalNetworks = wallet.withdrawalSupportedNetworks
            const networkNames = direction === 'from' ? sourceNetworks : withdrawalNetworks
            if (!networkNames || networkNames.length === 0) return []

            return networkNames.map(networkName => {
                const network = networks.find(n => n.name === networkName)
                if (!network) return null
                return {
                    address: wallet.address,
                    network,
                }
            })
        }).flat().filter(item => item !== null) as Array<{ address: string, network: NetworkWithTokens }>
    }, [activeWallets, direction, networks])

    useEffect(() => {
        if (walletNetworks)
            useBalanceStore.getState().initAllBalances(walletNetworks)
    }, [walletNetworks])

    const allBalances = useBalanceStore(s => s.allBalances)
    return allBalances
}