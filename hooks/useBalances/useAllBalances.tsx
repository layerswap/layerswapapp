import useWallet from "../useWallet"
import { useSettingsState } from "../../context/settings"
import { useBalanceStore } from "../../stores/balanceStore"
import { SwapDirection } from "../../components/DTOs/SwapFormValues"
import { useEffect, useMemo } from "react"
import { NetworkWithTokens } from "../../Models/Network"
import { SelectedWallet } from "@/context/selectedAccounts/pickerSelectedWallets"

type Props = {
    direction: SwapDirection;
    pickerSelectedWallets: SelectedWallet[] | undefined;
}

type ExtendedSelectedWallet = SelectedWallet & {
    autofillSupportedNetworks?: string[];
    withdrawalSupportedNetworks?: string[];
};

export default function useAllBalances({ direction, pickerSelectedWallets }: Props) {
    const { wallets, providers } = useWallet()
    const networks = useSettingsState().networks
    const walletAddresses = useMemo(() => wallets.map(w => w.address).join(":"), [wallets])
    const activeWallets = useMemo(() => wallets.filter(w => w.isActive), [walletAddresses])

    const selectedWallets = useMemo(() => {
        return (pickerSelectedWallets ?? [])
            .map(sw => {
                const provider = providers.find(p => p.name === sw.providerName)
                return {
                    ...sw,
                    autofillSupportedNetworks: provider?.autofillSupportedNetworks,
                    withdrawalSupportedNetworks: provider?.withdrawalSupportedNetworks,
                }
            })
    }, [pickerSelectedWallets, providers]);

    const mergedWallets = useMemo((): ExtendedSelectedWallet[] => {
        const combined = [...selectedWallets, ...activeWallets.map(w => ({
            wallet: w,
            address: w.address,
            providerName: w.providerName,
            autofillSupportedNetworks: w?.autofillSupportedNetworks,
            withdrawalSupportedNetworks: w?.withdrawalSupportedNetworks,
        }))];

        const unique = new Map<string, SelectedWallet>();
        for (const wallet of combined) {
            if (wallet.address && !unique.has(wallet.address)) {
                unique.set(wallet.address, wallet);
            }
        }

        return Array.from(unique.values());
    }, [activeWallets, selectedWallets]);

    const walletNetworks = useMemo(() => {
        return mergedWallets.flatMap(wallet => {
            const networkNames = direction === 'from'
                ? wallet?.withdrawalSupportedNetworks
                : wallet?.autofillSupportedNetworks;

            if (!networkNames || networkNames.length === 0) return [];

            return networkNames.map(networkName => {
                const network = networks.find(n => n.name === networkName);
                return network ? { address: wallet.address, network } : null;
            }).flat().filter(item => item !== null) as Array<{ address: string, network: NetworkWithTokens }>
        });
    }, [mergedWallets, direction, networks]);

    useEffect(() => {
        if (walletNetworks)
            useBalanceStore.getState().initAllBalances(walletNetworks)
    }, [])

    const allBalances = useBalanceStore(s => s.allBalances)
    return allBalances
}