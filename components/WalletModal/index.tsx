import { Context, createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react';
import { InternalConnector, Wallet, WalletProvider } from '../../Models/WalletProvider';
import ConnectorsList from './ConnectorsList';
import VaulDrawer from '../Modal/vaulModal';
import IconButton from '../Buttons/iconButton';

export type WalletModalConnector = InternalConnector & {
    qr?: ({
        state: 'loading',
        value: undefined
    } | {
        state: 'fetched',
        value: string
    });
}

type SharedType = { provider?: WalletProvider, connectCallback: (value: Wallet | undefined) => void }

type ConnectModalContextType = {
    connect: ({ provider, connectCallback }: SharedType) => void;
    cancel: () => void;
    selectedProvider: WalletProvider | undefined;
    setSelectedProvider: (value: WalletProvider | undefined) => void;
    isWalletModalOpen?: boolean;
    selectedConnector: WalletModalConnector | undefined;
    setSelectedConnector: (value: WalletModalConnector | undefined) => void;
};

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function WalletModalProvider({ children }) {
    const [connectConfig, setConnectConfig] = useState<SharedType | undefined>(undefined);

    const [selectedProvider, setSelectedProvider] = useState<WalletProvider | undefined>(undefined);
    const [selectedConnector, setSelectedConnector] = useState<WalletModalConnector | undefined>(undefined);
    const [open, setOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const connect = async ({ provider, connectCallback }: SharedType) => {
        if (!provider?.availableWalletsForConnect) {
            await provider?.connectWallet()
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
            return;
        }
    }, [setSelectedConnector, selectedConnector])

    useEffect(() => {
        if (!open && selectedConnector) {
            setSelectedConnector(undefined)
            setSelectedProvider(undefined)
        }
        setIsWalletModalOpen(open)
    }, [open])

    return (
        <ConnectModalContext.Provider value={{ connect, cancel, selectedProvider, setSelectedProvider, selectedConnector, setSelectedConnector, isWalletModalOpen }}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            selectedConnector &&
                            <div className='-ml-2'>
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>Connect wallet</p>
                    </div>
                }>
                <VaulDrawer.Snap id='item-1'>
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
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