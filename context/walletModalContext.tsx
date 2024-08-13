import { Context, createContext, useContext, useEffect, useState } from 'react'
import { Connector, useConnect } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../components/modal/modal';
import ResizablePanel from '../components/ResizablePanel';
import resolveWalletConnectorIcon from '../lib/wallets/utils/resolveWalletIcon';
import { evmConnectorNameResolver } from '../lib/wallets/evm/KnownEVMConnectors';

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
    const [qr, setQr] = useState<string>()

    useEffect(() => {
        if (!walletModalIsOpen) {
            setQr(undefined)
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
                                    const Icon = resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
                                    return (
                                        <div key={index}>
                                            <button
                                                type="button"
                                                className="w-full hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 py-2"
                                                onClick={async () => {
                                                    try {
                                                        connectAsync({
                                                            chainId: mainnet.id,
                                                            connector: connector,
                                                        }, {
                                                            onSuccess: (data) => {
                                                                setWalletModalIsOpen(false)
                                                            },
                                                            onError: (error) => {
                                                                console.error(error)
                                                            }
                                                        });
                                                    } catch (e) {
                                                        console.log(e)
                                                    }

                                                    const uri = await getWalletConnectUri(connector)
                                                    setQr(uri)
                                                }}
                                            >
                                                <div className="flex gap-3 items-center font-semibold">
                                                    <Icon className="w-8 h-8 rounded-md bg-secondary-900" />
                                                    <p>{connector.name}</p>
                                                </div>
                                            </button>
                                        </div>
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
): Promise<string> => {
    const provider = await connector.getProvider();

    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }

    return new Promise<string>((resolve) =>
        // Wagmi v2 doesn't have a return type for provider yet
        // @ts-expect-error
        provider.once('display_uri', () => {
            resolve((provider as any).signer.uri);
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

