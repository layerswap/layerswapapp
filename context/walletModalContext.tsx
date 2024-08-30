import { Context, createContext, useContext, useEffect, useState } from 'react'
import { Connector, useConnect, useDisconnect, useSwitchAccount } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../components/modal/modal';
import ResizablePanel from '../components/ResizablePanel';
import resolveWalletConnectorIcon from '../lib/wallets/utils/resolveWalletIcon';
import { Loader } from 'lucide-react';
import { WalletButton } from '@rainbow-me/rainbowkit';
import { isMobile } from '../lib/isMobile';

const WalletModalContext = createContext<WalletModalContextType | null>(null);

type WalletModalContextType = {
    walletModalIsOpen: boolean;
    availableWalletsForConnection: readonly Connector[];
    setAvailableWalletsForConnection: (connectors: readonly Connector[]) => void;
    setWalletModalIsOpen: (seconds: boolean) => void,
}

export function WalletModalProvider({ children }) {
    const [walletModalIsOpen, setWalletModalIsOpen] = useState<boolean>(false)
    const [availableWalletsForConnection, setAvailableWalletsForConnection] = useState<readonly Connector[]>([])
    const { connectAsync } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const { connectors: connectedWallets } = useSwitchAccount()
    const [qr, setQr] = useState<string>()
    const [connectorLoading, setConnectorLoading] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!walletModalIsOpen) {
            setQr(undefined)
            setConnectorLoading(undefined)
        }
    }, [walletModalIsOpen])

    return (
        <WalletModalContext.Provider value={{ walletModalIsOpen, availableWalletsForConnection, setWalletModalIsOpen, setAvailableWalletsForConnection }}>
            {children}
            <Modal height='fit' header='Connect new wallet' show={walletModalIsOpen} setShow={setWalletModalIsOpen} modalId='connectNewEVMWallet'>
                <ResizablePanel>
                    {
                        !qr ?
                            <div className="flex flex-col gap-1 w-full max-h-[40vh] overflow-y-auto styled-scroll">
                                {availableWalletsForConnection.map((connector, index) => {
                                    const connectorName = connector?.['rkDetails']?.['name']

                                    const Icon = resolveWalletConnectorIcon({ connector: connectorName })
                                    const isLoading = connectorLoading === connectorName
                                    const name = connector?.['rkDetails']?.['id']
                                    const alreadyConnectedConnectors = connectedWallets.filter((c) => c.id === connector.id)

                                    return (
                                        <WalletButton.Custom key={connector.uid} wallet={name}>
                                            {({ ready, connect, connector, connected }) => {
                                                return (
                                                    <div key={index}>
                                                        <button
                                                            type="button"
                                                            disabled={!!connectorLoading}
                                                            className="w-full flex items-center justify-between hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 py-2"
                                                            onClick={async () => {

                                                                try {
                                                                    setConnectorLoading(connectorName)

                                                                    if (alreadyConnectedConnectors.length > 0) {
                                                                        for (const alreadyConnectedConnector of alreadyConnectedConnectors) {
                                                                            await disconnectAsync({
                                                                                connector: alreadyConnectedConnector,
                                                                            })
                                                                        }
                                                                    }

                                                                    connectAsync({
                                                                        chainId: mainnet.id,
                                                                        connector: connector,
                                                                    }, {
                                                                        onSuccess: (data) => {
                                                                            setWalletModalIsOpen(false)
                                                                            setConnectorLoading(undefined)
                                                                        },
                                                                        onError: (error) => {
                                                                            console.log(error)
                                                                            setConnectorLoading(undefined)
                                                                        }
                                                                    });
                                                                } catch (e) {
                                                                    console.log(e)
                                                                }

                                                                if (isMobile()) {
                                                                    const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['mobile']?.['getUri'])
                                                                    window.location.href = uri
                                                                }
                                                                else {
                                                                    const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['qrCode']?.['getUri'])
                                                                    setQr(uri)
                                                                }

                                                            }}
                                                        >
                                                            <div className="flex gap-3 items-center font-semibold">
                                                                <Icon className="w-8 h-8 rounded-md bg-secondary-900" />
                                                                <p>{connectorName}</p>
                                                            </div>
                                                            {
                                                                isLoading &&
                                                                <Loader className='h-4 w-4 animate-spin' />
                                                            }
                                                        </button>
                                                    </div>
                                                );
                                            }}
                                        </WalletButton.Custom>
                                    )
                                })}
                            </div>
                            :
                            <div className='w-full flex justify-center pt-2'>
                                <QRCodeSVG
                                    className="rounded-lg"
                                    value={qr}
                                    includeMargin={true}
                                    size={350}
                                    level={"H"}
                                />
                            </div>
                    }
                </ResizablePanel>
            </Modal>
        </WalletModalContext.Provider>
    )
}

const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string,
): Promise<string> => {
    const provider = await connector.getProvider();

    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<string>((resolve) =>
        // Wagmi v2 doesn't have a return type for provider yet
        // @ts-expect-error
        provider.once('display_uri', (uri) => {
            resolve(uriConverter(uri));
        }),
    );
};


export function useWalletModal() {
    const data = useContext<WalletModalContextType>(WalletModalContext as Context<WalletModalContextType>);

    if (data === undefined) {
        throw new Error('useWalletModal must be used within a MenuStateProvider');
    }

    return data;
}