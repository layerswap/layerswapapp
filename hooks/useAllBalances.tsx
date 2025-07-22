import useWallet from "./useWallet"
import { useSettingsState } from "../context/settings"
import { useBalanceStore } from "../stores/balanceStore"
import { SwapDirection } from "../components/DTOs/SwapFormValues"
import { useEffect, useMemo } from "react"
import { NetworkWithTokens } from "../Models/Network"
import { SelectedWallet } from "@/context/selectedAccounts/pickerSelectedWallets"

type Props = {
    direction: SwapDirection;
    pickerSelectedWallets: SelectedWallet[] | undefined;
}
export default function useAllBalances({ direction, pickerSelectedWallets }: Props) {
    const networks = useSettingsState().networks

    const walletNetworks = useMemo(() => {
        return pickerSelectedWallets?.map(wallet => {
            const sourceNetworks = wallet?.wallet?.asSourceSupportedNetworks
            const withdrawalNetworks = wallet?.wallet?.withdrawalSupportedNetworks
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
    }, [pickerSelectedWallets, direction, networks])

    useEffect(() => {
        if (walletNetworks)
            useBalanceStore.getState().initAllBalances(walletNetworks)
    }, [walletNetworks])

    const allBalances = useBalanceStore(s => s.allBalances)
    return allBalances
}