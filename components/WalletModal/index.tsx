import { Context, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { InternalConnector, Wallet, WalletProvider } from '../../Models/WalletProvider';

export type WalletModalConnector = InternalConnector & {
    qr?: ({
        state: 'loading',
        value: undefined,
        deepLink?: undefined
    } | {
        state: 'fetched',
        value: string,
        deepLink?: string
    });
    showQrCode?: boolean
}

export type ModalWalletProvider = WalletProvider & {
    isSelectedFromFilter?: boolean;
}

type SharedType = { provider?: WalletProvider, connectCallback: (value: Wallet | undefined) => void, dismissible?: boolean }

type ConnectModalContextType = {
    connect: ({ provider, connectCallback, dismissible }: SharedType) => void;
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
    dismissible: boolean;
};

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function WalletModalProvider({ children }) {
    const [connectConfig, setConnectConfig] = useState<SharedType | undefined>(undefined);

    const [selectedProvider, setSelectedProvider] = useState<ModalWalletProvider | undefined>(undefined);
    const [selectedConnector, setSelectedConnector] = useState<WalletModalConnector | undefined>(undefined);
    const [selectedMultiChainConnector, setSelectedMultiChainConnector] = useState<InternalConnector | undefined>(undefined)
    const [open, setOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [dismissible, setDismissible] = useState(true);

    const connect = useCallback(async ({ provider, connectCallback, dismissible: dismissibleArg = true }: SharedType) => {
        const hasConnectorPicker = !!provider?.availableConnectors?.length
            || !!provider?.additionalConnectors?.length
            || !!provider?.requestAdditionalConnectors

        if (!hasConnectorPicker) {
            await provider?.connectWallet()
        }
        setSelectedProvider(provider);
        setDismissible(dismissibleArg);
        setOpen(true)
        setConnectConfig({ provider, connectCallback, dismissible: dismissibleArg });
        return;
    }, [])

    const cancel = useCallback(() => {
        setConnectConfig(prev => {
            prev?.connectCallback(undefined);
            return undefined;
        });
        setOpen(false);
    }, [])

    const onFinish = useCallback((connectedWallet?: Wallet | undefined) => {
        setConnectConfig(prev => {
            prev?.connectCallback(connectedWallet);
            return undefined;
        });
        setOpen(false);
    }, [])

    const goBack = useCallback(() => {
        if (selectedConnector) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            return;
        } else if (selectedMultiChainConnector) {
            setSelectedMultiChainConnector(undefined)
            return;
        }
    }, [selectedConnector, selectedMultiChainConnector])

    useEffect(() => {
        if (!open && (selectedConnector || selectedMultiChainConnector)) {
            setSelectedConnector(undefined)
            setSelectedMultiChainConnector(undefined)
            setSelectedProvider(undefined)
        }
        if (!open) setDismissible(true)
        setIsWalletModalOpen(open)
    }, [open])

    const contextValue = useMemo(() => ({
        connect, cancel, selectedProvider, setSelectedProvider,
        selectedConnector, setSelectedConnector,
        selectedMultiChainConnector, setSelectedMultiChainConnector,
        isWalletModalOpen, goBack, onFinish, setOpen, open, dismissible
    }), [connect, cancel, selectedProvider, selectedConnector,
        selectedMultiChainConnector, isWalletModalOpen, goBack, onFinish, open, dismissible])

    return (
        <ConnectModalContext.Provider value={contextValue}>
            {children}
        </ConnectModalContext.Provider>
    )
}

export const useConnectModal = () => {

    const context = useContext<ConnectModalContextType>(ConnectModalContext as Context<ConnectModalContextType>);

    if (!context) {
        throw new Error('useConnectModal must be used within a ConnectModalProvider');
    }

    const connect = useCallback(
        (provider?: WalletProvider, options?: { dismissible?: boolean }): Promise<Wallet | undefined> =>
            new Promise((res) => {
                context.connect({ provider, connectCallback: res, dismissible: options?.dismissible });
            }),
        [context.connect]
    );

    return useMemo(() => ({ ...context, connect }), [context, connect]);
};
