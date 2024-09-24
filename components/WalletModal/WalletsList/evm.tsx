import { FC } from 'react'
import { Connector, useConnect, useDisconnect, useSwitchAccount } from 'wagmi';
import { mainnet } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';
import resolveWalletConnectorIcon from '../../../lib/wallets/utils/resolveWalletIcon';
import { Loader } from 'lucide-react';
import { WalletButton } from '@rainbow-me/rainbowkit';
import { isMobile } from '../../../lib/isMobile';
import { WalletsListProps } from '..';
import toast from 'react-hot-toast';

const EVMConnectList: FC<WalletsListProps> = ({ modalWalletProvider: provider, onFinish, setSelectedProvider }) => {

    const { disconnectAsync } = useDisconnect()
    const { connectors, connect } = useConnect();

    return (
        !provider?.connector?.qr ?
            <div className="flex flex-col gap-1 w-full max-h-[40vh] overflow-y-auto styled-scroll">
                {provider?.availableWalletsForConnect?.map((connector: Connector, index) => {
                    const connectorName = connector?.['rkDetails']?.['name'] as string
                    const connectorId = connector?.['rkDetails']?.['id'] as string

                    const Icon = resolveWalletConnectorIcon({ connector: connectorId })
                    const isLoading = provider.connector?.name === connectorName
                    const name = connector?.['rkDetails']?.['id']
                    return (
                        <WalletButton.Custom key={index} wallet={name}>
                            {({ connector }) => {
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
                                                    await connector.connect()
                                                    onFinish()
                                                    setSelectedProvider(undefined)

                                                } catch (e) {
                                                    console.log(e)
                                                    toast.error('Error connecting wallet')
                                                    setSelectedProvider(undefined)
                                                }

                                                if (isMobile()) {
                                                    const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['mobile']?.['getUri'])
                                                    window.location.href = uri
                                                }
                                                else if (connector.type === 'walletConnect') {
                                                    const uri = await getWalletConnectUri(connector, connector?.['rkDetails']?.['qrCode']?.['getUri'])
                                                    const iconUrl = await (provider.availableWalletsForConnect as Connector[]).find((c) => c?.['rkDetails']?.['name'] === connectorName)?.['rkDetails']?.['iconUrl']()
                                                    if (provider.connector) setSelectedProvider({ ...provider, connector: { ...provider.connector, qr: uri, iconUrl } })
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
                    value={provider.connector.qr}
                    includeMargin={true}
                    size={350}
                    level={"H"}
                    imageSettings={{
                        src: provider.connector.iconUrl!,
                        x: undefined,
                        y: undefined,
                        height: 50,
                        width: 50,
                        excavate: true,
                    }}
                />
            </div>
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

export default EVMConnectList