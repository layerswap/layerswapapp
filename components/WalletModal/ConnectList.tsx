import { FC } from 'react'
import { QRCodeSVG } from 'qrcode.react';
import { resolveWalletConnectorIcon } from '../../lib/wallets/utils/resolveWalletIcon';
import { Loader } from 'lucide-react';
import { WalletsListProps } from '.';

const ConnectList: FC<WalletsListProps> = ({ modalWalletProvider: provider, onFinish, setSelectedProvider, selectedProvider }) => {

    const connect = async (connector: any) => {
        try {
            setSelectedProvider({ ...provider, connector: { name: connector.name } })

            provider?.connectConnector && await provider.connectConnector({ connector })

            setSelectedProvider(undefined)
            onFinish()
        } catch (e) {
            console.log(e)
            setSelectedProvider({ ...provider, connector: undefined })
        }
    }

    if (selectedProvider?.connector?.qr) return <div className="flex flex-col justify-start space-y-2">
        <div className='w-full flex justify-center pt-2'>
            <QRCodeSVG
                className="rounded-lg"
                value={selectedProvider?.connector?.qr}
                includeMargin={true}
                size={350}
                level={"H"}
            // imageSettings={{
            //     src: walletQRData.icon || "",
            //     x: undefined,
            //     y: undefined,
            //     height: 50,
            //     width: 50,
            //     excavate: true,
            // }}
            />
        </div>
    </div>
    console.log(provider)
    return (
        <div className="flex flex-col gap-1 w-full overflow-y-auto styled-scroll">
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
                            onClick={() => connect(connector)}
                        >
                            <div className="flex gap-3 items-center font-semibold">
                                {
                                    connector.icon ?
                                        <img src={connector.icon} alt={connector.name} className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                        : <Icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
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
        </div>
    )
}


export default ConnectList