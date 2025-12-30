import { FC } from "react";
import { WalletModalConnector } from ".";
import { ScanLine } from "lucide-react";
import { resolveWalletConnectorIcon } from "../../lib/wallets/utils/resolveWalletIcon";
import SubmitButton from "../buttons/submitButton";

export const InstalledExtensionNotFound: FC<{
    selectedConnector: WalletModalConnector | undefined,
    onConnect: (connector: WalletModalConnector) => void
}> = ({ selectedConnector, onConnect }) => {
    const ConnectorIcon = resolveWalletConnectorIcon({ connector: selectedConnector?.name, iconUrl: selectedConnector?.icon });
    return <div className='w-full h-[60vh] sm:h-full flex flex-col justify-between font-semibold'>
        <div className="flex grow items-center justify-center">
            <div className="flex-col flex items-center gap-1">
                <ConnectorIcon className="w-11 h-auto p-0.5 rounded-md bg-secondary-800" />
                {selectedConnector?.hasBrowserExtension ? (
                    <div className="py-1 text-center text-base font-medium">
                        <p>Wallet not found on your browser,</p>
                        <p>make sure you have the wallet installed</p>
                    </div>
                ) : (<p className='text-base font-semibold'>
                    <span>{selectedConnector?.name}</span> <span>is not installed</span>
                </p>)
                }
            </div>
        </div>
        <div className="flex flex-col gap-2 w-full">
            <SubmitButton
                onClick={() => {
                    if (!selectedConnector?.installUrl) return;
                    window.open(selectedConnector.installUrl, '_blank', 'noopener,noreferrer');
                }}
                buttonStyle="secondary"
                className="w-full"
            >
                <span className="flex items-center justify-center gap-2">
                    <span>Install</span>
                </span>
            </SubmitButton>
            {(selectedConnector && selectedConnector.hasBrowserExtension) ? <SubmitButton
                onClick={() => { onConnect({ ...selectedConnector, showQrCode: true }) }}
                buttonStyle="secondary"
                className="w-full"
            >
                <span className="flex items-center justify-center gap-2">
                    <ScanLine className="w-5 h-5" />
                    <span>Connect with your phone</span>
                </span>
            </SubmitButton>
                : null
            }
        </div>
    </div>
}