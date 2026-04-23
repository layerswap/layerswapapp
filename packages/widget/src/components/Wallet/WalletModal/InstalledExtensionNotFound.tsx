import { FC } from "react";
import { WalletModalConnector } from ".";
import { Download, ScanLine } from "lucide-react";
import { resolveWalletConnectorIcon } from "@/lib/wallets/utils/resolveWalletIcon";
import LayerSwapLogoSmall from "@/components/Icons/layerSwapLogoSmall";

export const InstalledExtensionNotFound: FC<{
    selectedConnector: WalletModalConnector | undefined,
    onConnect: (connector: WalletModalConnector) => void
}> = ({ selectedConnector, onConnect }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector, iconUrl: selectedConnector?.icon });
    return <div className='w-full h-full flex flex-col justify-between'>
        <div className="flex grow items-center justify-center">
            <div className="flex-col flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-3 bg-secondary-700 rounded-lg">
                        <LayerSwapLogoSmall className="w-11 h-auto" />
                    </div>
                    <div className="w-8 border-t border-dashed border-secondary-400" />
                    <div className="p-3 bg-secondary-700 rounded-lg">
                        <ConnectorIcon className="w-11 h-auto" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-base font-medium text-primary-text">{selectedConnector?.name} not detected</p>
                    <p className="text-sm font-normal text-secondary-text mt-1">
                        Install the extension or connect with your phone
                    </p>
                </div>
            </div>
        </div>
        <div className="flex flex-col gap-2 w-full">
            {selectedConnector && selectedConnector.hasBrowserExtension && (
                <button
                    type="button"
                    onClick={() => { onConnect({ ...selectedConnector, showQrCode: true }) }}
                    className="flex items-center justify-center gap-2 w-full text-primary-text bg-secondary-300 hover:bg-secondary-400 p-3.5 rounded-xl text-sm font-medium transition duration-200 ease-in-out hover:brightness-125 cursor-pointer"
                >
                    <ScanLine className="w-4 h-4" />
                    <span>Connect with your phone</span>
                </button>
            )}
            {selectedConnector?.installUrl && (
                <button
                    type="button"
                    onClick={() => {
                        window.open(selectedConnector.installUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center justify-center gap-2 w-full text-secondary-text hover:text-primary-text p-3.5 rounded-xl text-sm font-medium transition duration-200 ease-in-out cursor-pointer"
                >
                    <Download className="w-4 h-4" />
                    <span>Install {selectedConnector?.name}</span>
                </button>
            )}
        </div>
    </div>
}
