"use client"
import { useCallback, useMemo, type ReactNode } from "react"
import { truncateDecimals } from "@layerswap/utils"
import { WalletListAdaptersProvider, type WalletListAdapters } from "@layerswap/ui-kit/components"
import { useSettingsState } from "@/context/settings"
import { useBalance } from "@/lib/balances/useBalance"
import { useAddressName, useLabeledAddress } from "@/stores/addressBookStore"
import { useConnectModal } from "@/components/Wallet/WalletModal"
import { SaveToBookNameForm } from "@/components/AddressBook/SaveToBookInline"

const useWidgetWalletBalance: WalletListAdapters["useWalletBalance"] = ({ address, network, token }) => {
    const { networks } = useSettingsState()
    const balanceNetwork = token && network ? networks.find(n => n.name === network.name && n.tokens.some(t => t.symbol === token.symbol)) : undefined
    const { balances, isLoading } = useBalance(address, balanceNetwork)
    const walletBalance = balances?.find(b => b?.token === token?.symbol)
    return {
        formatted: walletBalance?.amount !== undefined ? truncateDecimals(walletBalance.amount, token?.precision) : undefined,
        isLoading
    }
}

const useWidgetAddressLabel: WalletListAdapters["useAddressLabel"] = (address, network, providerName) => {
    const name = useAddressName(address, network, providerName)
    const labeled = useLabeledAddress(address, network, providerName)
    return { name, labeled }
}

const renderSaveForm: WalletListAdapters["renderSaveForm"] = ({ address, network, onDone }) =>
    <SaveToBookNameForm address={address} network={network} onDone={onDone} compact />

export const WidgetWalletListAdapters = ({ children }: { children: ReactNode }) => {
    const { networks } = useSettingsState()
    const { connect } = useConnectModal()
    const connectAdapter = useCallback<WalletListAdapters["connect"]>((provider) => connect(provider), [connect])
    const adapters = useMemo<Partial<WalletListAdapters>>(() => ({
        networks,
        connect: connectAdapter,
        useWalletBalance: useWidgetWalletBalance,
        useAddressLabel: useWidgetAddressLabel,
        renderSaveForm,
    }), [networks, connectAdapter])
    return <WalletListAdaptersProvider adapters={adapters}>{children}</WalletListAdaptersProvider>
}
