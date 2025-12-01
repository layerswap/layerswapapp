"use client";
import { Context, createContext, useCallback, useContext, useEffect, useState } from 'react'
import { InternalConnector, Wallet, WalletConnectionProvider } from '@/types/wallet';

export type WalletModalConnector = InternalConnector & {
    qr?: ({
        state: 'loading',
        value: undefined
    } | {
        state: 'fetched',
        value: string
    });
}

export type ModalWalletProvider = WalletConnectionProvider & {
    isSelectedFromFilter?: boolean;
}

type SharedType = { provider?: WalletConnectionProvider, connectCallback: (value: Wallet | undefined) => void }

type ConnectModalContextType = {
    connect: ({ provider, connectCallback }: SharedType) => void;
    cancel: () => void;
    selectedProvider: ModalWalletProvider | undefined;
    setSelectedProvider: (value: ModalWalletProvider | undefined) => void;
    isWalletModalOpen?: boolean;
    selectedConnector: WalletModalConnector | undefined;
    setSelectedConnector: (value: WalletModalConnector | undefined) => void;
    selectedMultiChainConnector: InternalConnector | undefined;
    setSelectedMultiChainConnector: (value: InternalConnector | undefined) => void;
    goBack: () => void;
    onFinish: (connectedWallet?: Wallet | undefined) => void;
    setOpen: (value: boolean) => void;
    open: boolean;
};

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function WalletModalProvider({ children }) {
    const [connectConfig, setConnectConfig] = useState<SharedType | undefined>(undefined);

    const [selectedProvider, setSelectedProvider] = useState<ModalWalletProvider | undefined>(undefined);
    const [selectedConnector, setSelectedConnector] = useState<WalletModalConnector | undefined>(undefined);
    const [selectedMultiChainConnector, setSelectedMultiChainConnector] = useState<InternalConnector | undefined>(undefined)
    const [open, setOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const connect = async ({ provider, connectCallback }: SharedType) => {
        if (provider && (!provider?.availableWalletsForConnect || provider?.availableWalletsForConnect?.length == 1)) {
            await provider?.connectWallet()
            setConnectConfig({ provider, connectCallback });
            return
        }
        setSelectedProvider(provider);
        setOpen(true)
        setConnectConfig({ provider, connectCallback });
        return;
    }

    const cancel = () => {
        if (connectConfig) {
            connectConfig.connectCallback(undefined);
            setConnectConfig(undefined);
        }
        setOpen(false);
    }

    const onFinish = (connectedWallet?: Wallet | undefined) => {
        if (connectConfig) {
            connectConfig.connectCallback(connectedWallet);
            setConnectConfig(undefined);
        }
        setOpen(false);
    }

    const goBack = useCallback(() => {
        if (selectedConnector) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            return;
        } else if (selectedMultiChainConnector) {
            setSelectedMultiChainConnector(undefined)
            return;
        }
    }, [setSelectedConnector, selectedMultiChainConnector, selectedConnector, selectedMultiChainConnector])

    useEffect(() => {
        if (!open && (selectedConnector || selectedMultiChainConnector)) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            setSelectedProvider(undefined)
        }
        setIsWalletModalOpen(open)
    }, [open])

    return (
        <ConnectModalContext.Provider value={{ connect, cancel, selectedProvider, setSelectedProvider, selectedConnector, setSelectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector, isWalletModalOpen, goBack, onFinish, setOpen, open }}>
            {children}
        </ConnectModalContext.Provider>
    )
}

export const useConnectModal = () => {

    const context = useContext<ConnectModalContextType>(ConnectModalContext as Context<ConnectModalContextType>);

    if (context === undefined) {
        throw new Error('useConnectModal must be used within a ConnectModalProvider');
    }

    const connect: (provider?: WalletConnectionProvider) => Promise<Wallet | undefined> = (provider) =>
        new Promise((res) => {
            context.connect({ provider, connectCallback: res });
        });

    return { ...context, connect };
};