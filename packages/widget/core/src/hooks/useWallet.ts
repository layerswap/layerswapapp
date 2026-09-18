"use client"
import { Network } from "@layerswap/widget-types";
import { useWallet as useWalletCore, type WalletPurpose } from "@layerswap/wallet-core";
import { useSettingsState } from "@/context/settings";

export default function useWallet(network?: Network | undefined, purpose?: WalletPurpose) {
    const { networks } = useSettingsState()
    return useWalletCore<Network>(networks, network, purpose)
}
