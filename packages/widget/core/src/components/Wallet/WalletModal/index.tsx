"use client";
import { Context, createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useMemo, useState, } from "react"
import { connectModalStore } from "@layerswap/ui-kit"
import * as UiKit from "@layerswap/ui-kit/ui"
import type { ModalWalletProvider } from "@layerswap/ui-kit/ui"
import type { WalletConnectionProvider, WalletModalConnector } from "@layerswap/ui-kit/types";
import type { Wallet } from "@layerswap/utils";

export type { WalletModalConnector } from "@layerswap/ui-kit/types"
export type { ModalWalletProvider } from "@layerswap/ui-kit/ui"

export type ConnectPresentation = "modal" | "inline"

type ConnectOptions = {
    dismissible?: boolean
    topContent?: ReactNode
    fullHeight?: boolean
    hideHeader?: boolean
}

type ConnectModalContextType = {
    connect: (provider?: WalletConnectionProvider, options?: ConnectOptions) => Promise<Wallet | undefined>
    cancel: () => void
    selectedProvider: ModalWalletProvider | undefined
    setSelectedProvider: (provider: ModalWalletProvider | undefined) => void
    selectedConnector: WalletModalConnector | undefined
    setSelectedConnector: Dispatch<SetStateAction<WalletModalConnector | undefined>>
    selectedMultiChainConnector: WalletModalConnector | undefined
    setSelectedMultiChainConnector: (connector: WalletModalConnector | undefined) => void
    goBack: () => void
    onFinish: (wallet?: Wallet) => void
    setOpen: (open: boolean) => void
    open: boolean
    isWalletModalOpen: boolean
    presentation: ConnectPresentation
    setPresentation: (presentation: ConnectPresentation) => void
    dismissible: boolean
    topContent: ReactNode
    fullHeight: boolean
    hideHeader: boolean
}

const ConnectModalContext = createContext<ConnectModalContextType | null>(null)

export function WalletModalProvider({ children }: { children: ReactNode }) {
    return (
        <UiKit.WalletModalProvider>
            <WalletModalShell>{children}</WalletModalShell>
        </UiKit.WalletModalProvider>
    )
}

function WalletModalShell({ children }: { children: ReactNode }) {
    const {
        selectedProvider,
        setSelectedProvider,
        selectedConnector,
        setSelectedConnector,
        selectedMultiChainConnector,
        setSelectedMultiChainConnector,
        start,
        cancel: cancelFlow,
        finish,
        goBack,
    } = UiKit.useConnectModal()
    const [open, setOpen] = useState(false)
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
    const [presentation, setPresentation] = useState<ConnectPresentation>("modal")
    const [dismissible, setDismissible] = useState(true)
    const [topContent, setTopContent] = useState<ReactNode>(null)
    const [fullHeight, setFullHeight] = useState(false)
    const [hideHeader, setHideHeader] = useState(false)

    const connect = useCallback(async (
        provider?: WalletConnectionProvider,
        options: ConnectOptions = {},
    ) => {
        const hasConnectorPicker = !!provider?.availableConnectors?.length
            || !!provider?.additionalConnectors?.length
            || !!provider?.requestAdditionalConnectors

        if (!hasConnectorPicker) await provider?.connectWallet()

        setPresentation("modal")
        setDismissible(options.dismissible ?? true)
        setTopContent(options.topContent ?? null)
        setFullHeight(options.fullHeight ?? false)
        setHideHeader(options.hideHeader ?? false)
        setOpen(true)
        return start(provider)
    }, [start])

    const cancel = useCallback(() => {
        cancelFlow()
        setOpen(false)
    }, [cancelFlow])

    const onFinish = useCallback((wallet?: Wallet) => {
        finish(wallet)
        setOpen(false)
    }, [finish])

    useEffect(() => {
        if (!open && (selectedConnector || selectedMultiChainConnector)) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            setSelectedProvider(undefined)
        }
        if (!open) {
            setDismissible(true)
            setTopContent(null)
            setFullHeight(false)
            setHideHeader(false)
            setPresentation("modal")
        }
        setIsWalletModalOpen(open)
        connectModalStore._syncOpen(open)
    }, [open])

    const value = useMemo<ConnectModalContextType>(() => ({
        connect,
        cancel,
        selectedProvider,
        setSelectedProvider,
        selectedConnector,
        setSelectedConnector,
        selectedMultiChainConnector,
        setSelectedMultiChainConnector,
        goBack,
        onFinish,
        setOpen,
        open,
        isWalletModalOpen,
        presentation,
        setPresentation,
        dismissible,
        topContent,
        fullHeight,
        hideHeader,
    }), [
        cancel,
        connect,
        dismissible,
        fullHeight,
        goBack,
        hideHeader,
        isWalletModalOpen,
        onFinish,
        open,
        presentation,
        selectedConnector,
        selectedMultiChainConnector,
        selectedProvider,
        topContent,
    ])

    return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>
}

export function useConnectModal() {
    const context = useContext(ConnectModalContext as Context<ConnectModalContextType>)
    if (!context) throw new Error("useConnectModal must be used within a ConnectModalProvider")
    return context
}
