import { FC } from "react";
import { WalletModalConnector } from ".";
import StyledQRCode from "@/components/Common/StyledQRCode";
import CopyButton from "@/components/Buttons/copyButton";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import WalletIcon from "@/components/Icons/WalletIcon";
import { ExternalLink } from "lucide-react";

export const WalletQrCode: FC<{ selectedConnector: WalletModalConnector }> = ({ selectedConnector }) => {
    const connectorIconSrc = selectedConnector.icon

    const ConnectorImg = ({ className, size }: { className?: string, size: number }) =>
        connectorIconSrc ? (
            <ImageWithFallback
                src={connectorIconSrc}
                alt={selectedConnector?.name}
                width={size}
                height={size}
                className={className}
            />
        ) : <WalletIcon className={className} />

    return <div className="flex flex-col items-center h-full justify-between">
        <div className="flex flex-col items-center gap-3 grow justify-center">
            <div className="flex items-center gap-2">
                <ConnectorImg className="w-6 h-6" size={24} />
                <p className="text-sm font-medium text-primary-text">{selectedConnector?.name}</p>
            </div>
            <div className="bg-secondary-500 p-3 rounded-2xl">
                {
                    selectedConnector?.qr?.state == 'fetched' ?
                        <StyledQRCode
                            value={selectedConnector?.qr.value ?? ''}
                            size={220}
                            logo={selectedConnector.icon}
                            ecLevel="M"
                        />
                        :
                        <div className="w-[220px] h-[220px] relative">
                            <div className="w-full h-full bg-secondary-300 animate-pulse rounded-lg" />
                            <ConnectorImg className='h-10 w-10 absolute top-[calc(50%-20px)] left-[calc(50%-20px)]' size={40} />
                        </div>
                }
            </div>
            <p className="text-xs text-secondary-text">Scan with your phone to connect</p>
        </div>
        <div className="w-full flex flex-col gap-2">
            {selectedConnector?.qr?.deepLink && (
                <a
                    href={selectedConnector.qr.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className='bg-primary-500 hover:brightness-110 text-primary-buttonTextColor w-full px-3 py-3 rounded-xl flex justify-center items-center gap-2 text-sm font-medium transition duration-200 ease-in-out cursor-pointer'
                >
                    <ExternalLink className="h-4 w-4" />
                    Open in {selectedConnector?.name || 'wallet'}
                </a>
            )}
            <div className='bg-secondary-300 hover:bg-secondary-400 text-secondary-text w-full px-3 py-3 rounded-xl flex justify-center items-center text-sm font-medium transition duration-200 ease-in-out cursor-pointer'>
                <CopyButton disabled={!selectedConnector?.qr?.value} toCopy={selectedConnector?.qr?.deepLink || selectedConnector?.qr?.value || ''}>Copy link</CopyButton>
            </div>
        </div>
    </div>
}
