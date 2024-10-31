import { FC, useState } from 'react'
import { Connector, useConnect } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';
import { resolveWalletConnectorIcon } from '../../../lib/wallets/utils/resolveWalletIcon';
import { Loader } from 'lucide-react';
import { WalletsListProps } from '..';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../shadcn/dialog';
import { isMobile } from '../../../lib/wallets/connectors/utils/isMobile';

const EVMConnectList: FC<WalletsListProps> = ({ modalWalletProvider: provider, onFinish, setSelectedProvider }) => {

    const { connectAsync } = useConnect();
    const [walletQRData, setWalletQRData] = useState<{ qr: string, icon: string | undefined } | undefined>(undefined)

    return (
        <div className="flex flex-col gap-1 w-full overflow-y-auto styled-scroll">
            {/* //TODO: refactor ordering */}
            {provider?.availableWalletsForConnect?.sort((a, b) => (a.order || 100) - (b.order || 100))?.map((connector, index) => {
                const connectorName = connector?.name
                const connectorId = connector?.id

                const Icon = resolveWalletConnectorIcon({ connector: connectorId })

                const isLoading = provider.connector?.name === connectorName

                return (
                    <div key={index}>
                        <button
                            type="button"
                            disabled={!!provider.connector}
                            className="w-full flex items-center justify-between hover:bg-secondary-500 transition-colors duration-200 rounded-xl px-2 py-2"
                            onClick={async () => {
                                try {
                                    setSelectedProvider({ ...provider, connector: { name: connectorName } })
                                    await connector.disconnect()
                                    if (connector.id !== 'walletConnect') {
                                        if (isMobile()) {
                                            getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                                                window.location.href = uri;
                                            })
                                        }
                                        else {
                                            getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                                                const qrData = {
                                                    qr: uri,
                                                    icon: undefined
                                                }
                                                setWalletQRData(qrData)
                                            })
                                        }
                                    }

                                    await connectAsync({
                                        chainId: mainnet.id,
                                        connector: connector,
                                    });

                                    setSelectedProvider(undefined)
                                    onFinish()

                                } catch (e) {
                                    //TODO: handle error like in transfer
                                    toast.error('Error connecting wallet')
                                    setSelectedProvider({ ...provider, connector: undefined })
                                }
                            }}
                        >
                            <div className="flex gap-3 items-center font-semibold">
                                {
                                    connector.icon ?
                                        <img src={connector.icon} className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                        : <Icon className="w-8 h-8 rounded-md bg-secondary-900" />
                                }
                                <p>{connectorName}</p>
                            </div>
                            {
                                isLoading &&
                                <Loader className='h-4 w-4 animate-spin' />
                            }
                        </button>
                    </div>
                )
            })}
            {
                walletQRData && <Dialog open={!!walletQRData} onOpenChange={(open) => {
                    if (!open) {
                        setWalletQRData(undefined)
                        setSelectedProvider({ ...provider, connector: undefined })
                    }
                }}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-center">Connect wallet</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col justify-start space-y-2">
                            <div className='w-full flex justify-center pt-2'>
                                <QRCodeSVG
                                    className="rounded-lg"
                                    value={walletQRData.qr}
                                    includeMargin={true}
                                    size={350}
                                    level={"H"}
                                    imageSettings={{
                                        src: walletQRData.icon || "",
                                        x: undefined,
                                        y: undefined,
                                        height: 50,
                                        width: 50,
                                        excavate: true,
                                    }}
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            }
        </div>
    )
}


const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string = (uri) => uri,
    useCallback: (uri: string) => void,
): Promise<void> => {
    const provider = await connector.getProvider();
    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<void>((resolve) => {
        return provider?.['once'] && provider['once']('display_uri', (uri) => {
            const converted = uriConverter(uri);
            resolve(useCallback(uriConverter(uri)));
        })
    }
    );
};

export default EVMConnectList