import { type Wallet } from '@layerswap/widget-types';
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useMemo, useState, } from "react"
import { connectModalStore } from "@/lib/walletConnect/connectModalStore"
import type { WalletConnectionProvider, WalletModalConnector } from "@/types";

export type ModalWalletProvider = WalletConnectionProvider & {
    isSelectedFromFilter?: boolean
}

type ConnectModalContextType = {
    selectedProvider: ModalWalletProvider | undefined
    setSelectedProvider: (provider: ModalWalletProvider | undefined) => void
    selectedConnector: WalletModalConnector | undefined
    setSelectedConnector: Dispatch<SetStateAction<WalletModalConnector | undefined>>
    selectedMultiChainConnector: WalletModalConnector | undefined
    setSelectedMultiChainConnector: (connector: WalletModalConnector | undefined) => void
    start: (provider?: WalletConnectionProvider) => Promise<Wallet | undefined>
    cancel: () => void
    finish: (wallet?: Wallet) => void
    goBack: () => void
}

const ConnectModalContext = createContext<ConnectModalContextType | null>(null)

export function WalletModalProvider({ children }: { children: ReactNode }) {
    const [selectedProvider, setSelectedProvider] = useState<ModalWalletProvider | undefined>()
    const [selectedConnector, setSelectedConnector] = useState<WalletModalConnector | undefined>()
    const [selectedMultiChainConnector, setSelectedMultiChainConnector] = useState<WalletModalConnector | undefined>()
    const [resolveConnection, setResolveConnection] = useState<((wallet: Wallet | undefined) => void) | undefined>()

    const start = useCallback((provider?: WalletConnectionProvider) => new Promise<Wallet | undefined>(resolve => {
        setSelectedProvider(provider)
        setResolveConnection(() => resolve)
    }), [])

    const resolve = useCallback((wallet: Wallet | undefined) => {
        setResolveConnection(current => {
            current?.(wallet)
            return undefined
        })
        setSelectedConnector(undefined)
        setSelectedMultiChainConnector(undefined)
        setSelectedProvider(undefined)
    }, [])

    const cancel = useCallback(() => resolve(undefined), [resolve])
    const finish = useCallback((wallet?: Wallet) => resolve(wallet), [resolve])

    const goBack = useCallback(() => {
        if (selectedConnector) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            return
        }
        if (selectedMultiChainConnector) setSelectedMultiChainConnector(undefined)
    }, [selectedConnector, selectedMultiChainConnector])

    useEffect(() => {
        connectModalStore._syncSelectedConnector(selectedConnector)
    }, [selectedConnector])

    useEffect(() => connectModalStore._registerWriter(connector => {
        setSelectedConnector(connector as WalletModalConnector | undefined)
    }), [])

    const value = useMemo(() => ({
        selectedProvider,
        setSelectedProvider,
        selectedConnector,
        setSelectedConnector,
        selectedMultiChainConnector,
        setSelectedMultiChainConnector,
        start,
        cancel,
        finish,
        goBack,
    }), [cancel, finish, goBack, selectedConnector, selectedMultiChainConnector, selectedProvider, start])

    return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>
}

export function useConnectModal() {
    const context = useContext(ConnectModalContext)
    if (!context) throw new Error("useConnectModal must be used within WalletModalProvider")
    return context
}
