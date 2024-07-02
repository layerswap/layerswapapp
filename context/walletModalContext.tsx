import { Context, createContext, useContext, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/shadcn/dialog';
import ConnectButton from '../components/buttons/connectButton';
import { Plus } from 'lucide-react';
import { Config, Connector, useAccount, useConnect, useConnectors, useSwitchAccount } from 'wagmi';
import { connectors } from '../components/RainbowKit';
import useWallet from '../hooks/useWallet';
import { WalletButton } from '@rainbow-me/rainbowkit';
import { ConnectMutateAsync } from 'wagmi/query';
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
    const { connector } = useAccount()
    const { connectors: connectedWallets } = useSwitchAccount()
    const resolvedConnectros = resolveAvailableWallets(allConnectors, connectedWallets)
    const { connectAsync } = useConnect();
    const [qr, setqr] = useState<string>()

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
                                const name = connector?.['rkDetails']?.['id']
                                return <WalletButton.Custom key={connector.uid} wallet={name}>
                                    {({ ready, connect, connector, connected }) => {
                                        return (
                                            <button
                                                type="button"
                                                className="bg-primary-500 text-white px-4 py-2 rounded-lg block"
                                                onClick={async () => {
                                                    const result = connectAsync({
                                                        chainId: mainnet.id,
                                                        connector: connector,
                                                    }, {
                                                        onSuccess: (data) => {
                                                            setWalletModalIsOpen(false)
                                                        }
                                                    });

                                                    const bar = await getWalletConnectUri(connector, connector?.['rkDetails']?.['qrCode']?.['getUri']!)
                                                    setqr(bar)
                                                }}
                                            >
                                                Connect {connector?.['rkDetails']?.['name']}
                                            </button>
                                        );
                                    }}
                                </WalletButton.Custom>
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



const resolveAvailableWallets = (all_connectors: readonly Connector[], connected: readonly Connector[]) => {
    console.log("connected", connected)
    console.log("all_connectors", all_connectors)
    const available_connectors = all_connectors.filter((connector, index, array) => {
        return connector.rkDetails
            && array.findIndex(a => a?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']) === index
            && !connected.some((connected_connector) => {
                return connected_connector?.['rkDetails']?.['id'] === connector?.['rkDetails']?.['id']
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

