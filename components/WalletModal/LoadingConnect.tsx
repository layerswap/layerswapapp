import { FC } from "react";
import { WalletModalConnector } from ".";
import { Link2Off, RotateCw } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import LayerSwapLogoSmall from "../icons/layerSwapLogoSmall";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";

export const LoadingConnect: FC<{ onRetry: () => void, selectedConnector: WalletModalConnector, connectionError: string | undefined }> = ({ onRetry, selectedConnector, connectionError }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector.icon });
    const isMobilePlatform = isMobile();

    return (
        <div className='w-full flex flex-col justify-between items-center relative h-full'>
            {
                selectedConnector &&
                <div className="flex grow items-center">
                    <div className="flex flex-col gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-3 bg-secondary-700 rounded-lg">
                                <LayerSwapLogoSmall className="w-11 h-auto" />
                            </div>
                            {
                                connectionError ?
                                    <Link2Off className="w-5 h-5 text-secondary-text" />
                                    :
                                    <div className="loader text-[3px]!" />
                            }
                            <div className="p-3 bg-secondary-700 rounded-lg">
                                <ConnectorIcon className="w-11 h-auto" />
                            </div>
                        </div>
                        <div className="text-center">
                            {connectionError ? (
                                <>
                                    <p className="text-base font-medium text-primary-text">Connection failed</p>
                                    <p className="text-sm font-normal text-secondary-text mt-1">{connectionError}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-base font-medium">{isMobilePlatform ? 'Approve connection in your wallet' : 'Approve connection in your wallet pop-up'}</p>
                                    <p className="text-sm font-normal text-secondary-text">{isMobilePlatform ? "Don't see the request? Check your wallet app." : "Don't see a pop-up? Check your browser windows."}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            }
            {
                connectionError &&
                <button
                    type="button"
                    className="flex gap-2 items-center justify-center w-full text-primary-text bg-secondary-300 hover:bg-secondary-400 p-3.5 rounded-xl text-sm font-medium transition duration-200 ease-in-out hover:brightness-125 cursor-pointer"
                    onClick={onRetry}
                >
                    <RotateCw className='h-4 w-4' />
                    <span>Try again</span>
                </button>
            }
        </div>
    )
}
