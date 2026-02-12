import { FC } from "react";
import { WalletModalConnector } from ".";
import { CircleX, Link2Off, RotateCw } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import clsx from "clsx";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";

export const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined }> = ({ onRetry, selectedConnector, connectionError }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });
    const { isMobile: isMobileSize } = useWindowDimensions()
    const isMobilePlatform = isMobile();

    return (
        <div
            className={clsx('w-full flex flex-col justify-center items-center font-semibold relative', {
                'h-[60vh]': isMobileSize,
                'h-full': !isMobileSize,
            })}
        >
            {
                selectedConnector &&
                <div className="flex grow items-center">
                    <div className="flex flex-col gap-3 items-center justify-end row-start-2 row-span-1">
                        <div className="flex-col flex items-center">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <div className="p-3 bg-secondary-700 rounded-lg z-10">
                                    <LayerSwapLogoSmall className="w-11 h-auto" />
                                </div>
                                {
                                    connectionError ?
                                        <Link2Off className="w-auto h-auto place-self-center" />
                                        :
                                        <div className="loader text-[3px]! place-self-center" />
                                }
                                <div className="p-3 bg-secondary-700 rounded-lg z-10">
                                    <ConnectorIcon className="w-11 h-auto" />
                                </div>
                            </div>
                        </div>
                        {
                            !connectionError &&
                            <div className="py-1 text-center">
                                <p className="text-base font-medium">{isMobilePlatform ? 'Approve connection in your wallet' : 'Approve connection in your wallet pop-up'}</p>
                                <p className="text-sm font-normal text-secondary-text">{isMobilePlatform ? "Don't see the request? Check your wallet app." : "Don't see a pop-up? Check your browser windows."}</p>
                            </div>
                        }
                    </div>
                </div>
            }
            {
                connectionError &&
                <div className={`bg-secondary-500 rounded-lg flex flex-col gap-1.5 items-center p-3 w-full bottom-0`}>
                    <div className="flex w-full gap-1 text-sm text-secondary-text justify-start">
                        <CircleX className="w-5 h-5 stroke-primary-500 mr-1 mt-0.5 shrink-0" />
                        <div className='flex flex-col gap-1'>
                            <p className='text-base text-white'>Failed to connect</p>
                            <p className="text-sm font-normal">
                                {connectionError}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="flex gap-1.5 items-center justify-center bg-secondary-400 w-full text-primary-text p-4 border-none rounded-lg cursor-pointer text-sm font-medium leading-4"
                        onClick={onRetry}
                    >
                        <RotateCw className='h-4 w-4' />
                        <span>Try again</span>
                    </button>
                </div>
            }
        </div>
    )
}