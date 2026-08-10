import { type InternalConnector } from '@layerswap/widget-types';
import { FC } from "react";
import type { WalletConnectionProvider, WalletModalConnector } from "@/types";
import { ImageWithFallback } from "./ImageWithFallback";
import WalletIcon from "./WalletIcon";
import CircularLoader from "./CircularLoader";

type MultichainConnectorModalProps = {
    selectedConnector: WalletModalConnector,
    providers: WalletConnectionProvider[],
    connect: (connector: InternalConnector, provider: WalletConnectionProvider) => Promise<void>
    /** True while ecosystem SDKs / registry fetches are still settling — more
     * variant rows may append, so show an explicit loading affordance instead
     * of letting rows pop in silently. */
    isLoadingMore?: boolean
}

export const MultichainConnectorPicker: FC<MultichainConnectorModalProps> = ({ selectedConnector, providers, connect, isLoadingMore }) => {
    const iconSrc = selectedConnector.icon
    return (
        <div className="flex flex-col justify-between h-full min-h-80">
            <div className="flex grow py-4">
                <div className="flex flex-col gap-2 grow items-center justify-center">
                    <div className="flex justify-center gap-1">
                        {iconSrc ? (
                            <ImageWithFallback
                                src={iconSrc}
                                alt={selectedConnector.name}
                                width="56"
                                height="56"
                                className="w-14 h-auto rounded-lg object-contain"
                            />
                        ) : (
                            <WalletIcon className="w-14 h-auto rounded-lg" />
                        )}
                    </div>
                    <p className="text-base text-center text-primary-text px-4">
                        <span>{selectedConnector.name}</span> <span>supports multiple network types. Please select the one you&apos;d like to use.</span>
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
                {
                    (selectedConnector.variants ?? []).map((connector, index) => {
                        const provider = providers.find(p => p.name === connector?.providerName)
                        return (
                            <button
                                type="button"
                                key={index}
                                onClick={async () => {
                                    if (provider) await connect(connector, provider)
                                }}
                                className="w-full h-fit flex items-center gap-3 bg-secondary-500 hover:bg-secondary-400 transition-colors duration-200 rounded-xl p-3"
                            >
                                {
                                    provider?.providerIcon &&
                                    <ImageWithFallback
                                        className="w-8 h-8 rounded-md"
                                        width={30}
                                        height={30}
                                        src={provider.providerIcon}
                                        alt={provider.name}
                                    />
                                }
                                <p>
                                    {connector?.providerName}
                                </p>
                            </button>
                        )
                    })
                }
                {isLoadingMore && (
                    <div className="w-full flex items-center justify-center gap-2 p-3">
                        <CircularLoader className="w-5 h-5 animate-spin" />
                        <p className="text-sm text-secondary-text">Checking for more networks...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
