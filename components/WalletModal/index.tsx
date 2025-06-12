import { Context, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { InternalConnector, Wallet, WalletProvider } from '../../Models/WalletProvider';

export type WalletModalConnector = InternalConnector & {
    qr?: ({
        state: 'loading',
        value: undefined
    } | {
        state: 'fetched',
        value: string
    });
}

export type ModalWalletProvider = WalletProvider & {
    isSelectedFromFilter?: boolean;
}

type SharedType = { provider?: WalletProvider, connectCallback: (value: Wallet | undefined) => void }

type ConnectModalContextType = {
    connect: ({ provider, connectCallback }: SharedType) => void;
    cancel: () => void;
    selectedProvider: ModalWalletProvider | undefined;
    setSelectedProvider: (value: ModalWalletProvider | undefined) => void;
    isWalletModalOpen?: boolean;
    selectedConnector: WalletModalConnector | undefined;
    setSelectedConnector: (value: WalletModalConnector | undefined) => void;
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
    const [open, setOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const connect = useCallback(async ({ provider, connectCallback }: SharedType) => {
        if (!provider?.availableWalletsForConnect) {
            await provider?.connectWallet()
        }
        setSelectedProvider(provider);
        setOpen(true)
        setConnectConfig({ provider, connectCallback });
        return;
    }, [setSelectedProvider, setOpen, setConnectConfig]);

    const cancel = useCallback(() => {
        if (connectConfig) {
            connectConfig.connectCallback(undefined);
            setConnectConfig(undefined);
        }
        setOpen(false);
    }, [connectConfig, setConnectConfig, setOpen]);

    const onFinish = useCallback((connectedWallet?: Wallet | undefined) => {
        if (connectConfig) {
            connectConfig.connectCallback(connectedWallet);
            setConnectConfig(undefined);
        }
        setOpen(false);
    }, [connectConfig, setConnectConfig, setOpen]);

    const goBack = useCallback(() => {
        if (selectedConnector) {
            setSelectedConnector(undefined)
            return;
        }
    }, [setSelectedConnector, selectedConnector])

    const value = useMemo(() => ({ connect, cancel, selectedProvider, setSelectedProvider, selectedConnector, setSelectedConnector, isWalletModalOpen, goBack, onFinish, setOpen, open }), [connect, cancel, selectedProvider, setSelectedProvider, selectedConnector, setSelectedConnector, isWalletModalOpen, goBack, onFinish, setOpen, open])
    
    return (
        <ConnectModalContext.Provider value={value}>
            {children}
        </ConnectModalContext.Provider>
    )
}

export const useConnectModal = () => {

    const context = useContext<ConnectModalContextType>(ConnectModalContext as Context<ConnectModalContextType>);

    if (context === undefined) {
        throw new Error('useConnectModal must be used within a ConnectModalProvider');
    }

    const connect: (provider?: WalletProvider) => Promise<Wallet | undefined> = (provider) =>
        new Promise((res) => {
            context.connect({ provider, connectCallback: res });
        });

    return { ...context, connect };
};