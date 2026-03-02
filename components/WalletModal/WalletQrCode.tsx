import { FC } from "react";
import { WalletModalConnector } from ".";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";

export const WalletQrCode: FC<{ selectedConnector: WalletModalConnector }> = ({ selectedConnector }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });

    return <div className="flex flex-col items-center h-[60vh] sm:h-full justify-between">
        <div className="flex flex-col items-center gap-3 grow justify-center">
            <div className="flex items-center gap-2">
                <ConnectorIcon className="w-6 h-6" />
                <p className="text-sm font-medium text-primary-text">{selectedConnector?.name}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl">
                {
                    selectedConnector?.qr?.state == 'fetched' ?
                        <QRCodeSVG
                            className="rounded-lg"
                            value={selectedConnector?.qr.value}
                            includeMargin={false}
                            size={220}
                            level={"H"}
                            imageSettings={
                                selectedConnector.icon
                                    ? {
                                        src: selectedConnector.icon,
                                        height: 40,
                                        width: 40,
                                        excavate: true,
                                    }
                                    : undefined
                            }
                        />
                        :
                        <div className="w-[220px] h-[220px] relative">
                            <div className="w-full h-full bg-secondary-300 animate-pulse rounded-lg" />
                            <ConnectorIcon className='h-10 w-10 absolute top-[calc(50%-20px)] left-[calc(50%-20px)]' />
                        </div>
                }
            </div>
            <p className="text-xs text-secondary-text">Scan with your phone to connect</p>
        </div>
        <div className='bg-secondary-300 hover:bg-secondary-400 text-secondary-text w-full px-3 py-3 rounded-xl flex justify-center items-center text-sm font-medium transition duration-200 ease-in-out cursor-pointer'>
            <CopyButton disabled={!selectedConnector?.qr?.value} toCopy={selectedConnector?.qr?.deepLink || selectedConnector?.qr?.value || ''}>Copy link</CopyButton>
        </div>
    </div>
}
