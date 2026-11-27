import { FC, useEffect, useState, type RefObject } from "react";
import type { WalletModalConnector } from "@layerswap/wallet-core/types";
import StyledQRCode from "../qr-code/StyledQRCode";
import CopyButton from "../buttons/CopyButton";
import { ImageWithFallback } from "../common/ImageWithFallback";
import WalletIcon from "../icons/WalletIcon";
import { motion } from "framer-motion";

export const WalletQrCode: FC<{ selectedConnector: WalletModalConnector, portalContainerRef: RefObject<HTMLDivElement | null> }> = ({ selectedConnector, portalContainerRef }) => {
    const connectorIconSrc = selectedConnector.icon
    const [qrMode, setQrMode] = useState<'waiting' | 'help' | 'plain'>('waiting')

    useEffect(() => {
        setQrMode('waiting')
        if (selectedConnector.qr?.state !== 'fetched' || !selectedConnector.qr.value) {
            return
        }

        const timeout = setTimeout(() => setQrMode('help'), 7000)
        return () => clearTimeout(timeout)
    }, [selectedConnector.id, selectedConnector.qr?.state, selectedConnector.qr?.value])

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

    return <div className="flex flex-col items-center h-full justify-between gap-3">
        <div className="flex flex-col items-center gap-3 grow justify-center">
            <div className="flex items-center gap-2">
                <ConnectorImg className="w-6 h-6" size={24} />
                <p className="text-sm font-medium text-primary-text">{selectedConnector?.name}</p>
            </div>
            <div className={`${qrMode === 'plain' ? 'bg-white' : 'bg-secondary-500'} p-3 rounded-2xl`}>
                {
                    selectedConnector?.qr?.state == 'fetched' ?
                        <StyledQRCode
                            value={selectedConnector?.qr.value ?? ''}
                            size={220}
                            logo={selectedConnector.icon}
                            ecLevel="M"
                            plain={qrMode === 'plain'}
                        />
                        :
                        <div className="w-[220px] h-[220px] relative">
                            <div className="w-full h-full bg-secondary-300 animate-pulse rounded-lg" />
                            <ConnectorImg className='h-10 w-10 absolute top-[calc(50%-20px)] left-[calc(50%-20px)]' size={40} />
                        </div>
                }
            </div>
            <p className="h-4 text-xs text-secondary-text">
                {qrMode === 'help' ? (
                    <motion.button type="button" className="underline" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} onClick={() => setQrMode('plain')}>
                        Trouble scanning? Show a regular QR
                    </motion.button>
                ) : <span>Scan with your phone to connect</span>}
            </p>
        </div>
        <div className="w-full flex flex-col gap-2">
            <div className='bg-secondary-300 hover:bg-secondary-400 text-secondary-text w-full px-3 py-3 rounded-xl flex justify-center items-center text-sm font-medium transition duration-200 ease-in-out cursor-pointer'>
                <CopyButton portalContainerRef={portalContainerRef} disabled={!selectedConnector?.qr?.value} toCopy={selectedConnector?.qr?.deepLink || selectedConnector?.qr?.value || ''}>Copy link</CopyButton>
            </div>
        </div>
    </div>
}
