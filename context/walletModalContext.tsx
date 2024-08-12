import { Context, createContext, useContext, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/shadcn/dialog';
import { Connector, useConnect, useConnectors, useSwitchAccount } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';

const WalletModalContext = createContext<WalletModalContextType | null>(null);

type WalletModalContextType = {
    walletModalIsOpen: boolean;
    setWalletModalIsOpen: (seconds: boolean) => void,
}

export function WalletModalProvider({ children }) {
    const [walletModalIsOpen, setWalletModalIsOpen] = useState<boolean>(false)
    const allConnectors = useConnectors()
    const { connectors: connectedWallets } = useSwitchAccount()
    const resolvedConnectros = resolveAvailableWallets(allConnectors, connectedWallets)
    const { connectAsync } = useConnect();
    const [qr, setQr] = useState<string>()

    useEffect(() => {
        if (!walletModalIsOpen) {
            setQr(undefined)
        }
    }, [walletModalIsOpen])

    return (
        <WalletModalContext.Provider value={{ walletModalIsOpen, setWalletModalIsOpen }}>
            {children}
            <Dialog open={walletModalIsOpen} onOpenChange={setWalletModalIsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-center">Wallets</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col justify-start space-y-2">
                        {
                            !qr &&
                            resolvedConnectros.map((connector) => {
                                return (
                                    <button
                                        type="button"
                                        className="bg-primary-500 text-white px-4 py-2 rounded-lg block"
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
                                        Connect {connector?.name}
                                    </button>
                                );
                            })
                        }
                        {
                            qr &&
                            <QRCodeSVG
                                className="rounded-lg"
                                value={qr}
                                includeMargin={true}
                                size={350}
                                level={"H"}
                            />
                        }
                    </div>
                    <DialogFooter>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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



const resolveAvailableWallets = (all_connectors: readonly Connector[], connected: readonly Connector[]) => {
    const available_connectors = all_connectors.filter((connector, index, array) => {
        return array.findIndex(a => a?.id === connector?.id) === index
            && !connected.some((connected_connector) => {
                return connected_connector.id === connector?.id
            })
    })
    return available_connectors

}


export function useWalletModal() {
    const data = useContext<WalletModalContextType>(WalletModalContext as Context<WalletModalContextType>);

    if (data === undefined) {
        throw new Error('useWalletModal must be used within a MenuStateProvider');
    }

    return data;
}

