import { FC } from "react";
import { WalletModalConnector } from ".";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import { QRCodeSVG } from "qrcode.react";
import CopyButton from "../buttons/copyButton";

export const WalletQrCode: FC<{ selectedConnector: WalletModalConnector }> = ({ selectedConnector }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });

    return <div className="flex flex-col justify-start space-y-2">
        <p className="text-secondary-text">
            Scan the QR code with your phone
        </p>
        <div className="w-full h-full bg-secondary-600 py-3 rounded-lg">
            <div className='flex flex-col justify-center items-center pt-2 w-fit mx-auto'>
                {
                    selectedConnector?.qr?.state == 'fetched' ?
                        <QRCodeSVG
                            className="rounded-lg"
                            value={selectedConnector?.qr.value}
                            includeMargin={true}
                            size={264}
                            level={"H"}
                            imageSettings={
                                selectedConnector.icon
                                    ? {
                                        src: selectedConnector.icon,
                                        height: 50,
                                        width: 50,
                                        excavate: true,
                                    }
                                    : undefined
                            }
                        />
                        :
                        <div className="w-[264px] h-[264px] relative" >
                            <div className="w-full h-full bg-secondary-500 animate-pulse rounded-xl" />
                            <ConnectorIcon className='h-[50px] w-[50px] absolute top-[calc(50%-25px)] right-[calc(50%-25px)]' />
                        </div>
                }
                <div className='bg-secondary-400 text-secondary-text w-full px-2 py-1.5 rounded-md mt-3 flex justify-center items-center'>
                    <CopyButton disabled={!selectedConnector?.qr?.value} toCopy={selectedConnector?.qr?.value || ''}>Copy QR URL</CopyButton>
                </div>
            </div>
        </div>
    </div>
}