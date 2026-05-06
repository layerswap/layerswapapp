
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { Network } from "@/Models/Network";
import { FC, useState } from "react";
import ResizablePanel from "@/components/ResizablePanel";
import { SelectAccountProps, Wallet, WalletProvider } from "@/Models/WalletProvider";
import WalletIcon from "@/components/icons/WalletIcon";
import { WalletItem } from "@/components/Wallet/WalletsList";
import { useConnectModal } from "@/components/WalletModal";

type Props = {
    provider: WalletProvider,
    onClick: (props: SelectAccountProps) => void,
    onConnect?: (wallet: Wallet) => void,
    destination: Network,
    destination_address?: string | undefined,
    isLoading: boolean,
    setIsLoading: (v: boolean) => void,
}

const ConnectedWallets: FC<Props> = ({ provider, onClick, onConnect, destination, destination_address, isLoading, setIsLoading }) => {

    const { connect } = useConnectModal()
    const connectedWallets = provider.connectedWallets?.filter(wallet => !wallet.isNotAvailable)

    const handleConnect = async () => {
        setIsLoading(true)
        const result = await connect(provider)
        if (onConnect && result) onConnect(result)
        setIsLoading(false)
    }

    if (!connectedWallets?.length) return null

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
                <div className="text-sm font-medium text-secondary-text flex items-center space-x-1">
                    <WalletIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
                    <p className="text-sm font-medium text-secondary-text"><span>Connected</span> <span>{connectedWallets.length > 1 ? 'Wallets' : 'Wallet'}</span></p>
                </div>
                <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200"
                >
                    {
                        isLoading ?
                            <RefreshCw className="h-3 w-auto animate-spin" />
                            :
                            <Plus className="h-3 w-auto" />
                    }
                    <p>Connect new</p>
                </button>
            </div>
            {
                connectedWallets.map((wallet, index) => {
                    return <WalletItem
                        key={`${index}${wallet.providerName}`}
                        account={wallet}
                        selectable
                        network={destination}
                        onWalletSelect={onClick}
                        selectedAddress={destination_address}
                    />
                })
            }
        </div>
    )
}

type NotCompatibleWalletsProps = {
    notCompatibleWallets: Wallet[],
    destination: Network,
    isLoading?: boolean,
}

export const NotCompatibleWallets: FC<NotCompatibleWalletsProps> = ({ notCompatibleWallets, destination, isLoading }) => {
    const [showIncompatibleWallets, setShowIncompatibleWallets] = useState(notCompatibleWallets.length === 1)

    if (!notCompatibleWallets.length) return null

    return (
        <ResizablePanel>
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => setShowIncompatibleWallets(!showIncompatibleWallets)}
                    disabled={isLoading}
                    type="button"
                    className="flex items-center justify-between w-full"
                >
                    <p className="text-sm font-medium text-secondary-text">
                        <span>Not compatible with</span> <span>{destination.display_name}</span>
                    </p>
                    <div
                        className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-3 w-auto animate-spin" />
                        ) : (
                            <div className="space-x-1 flex">
                                {notCompatibleWallets?.map((wallet) => (
                                    <div key={wallet.address} className="inline-flex items-center relative">
                                        <wallet.icon className="w-4 h-4 rounded-xs bg-secondary-800" />
                                    </div>
                                ))}
                                <ChevronDown
                                    className={`h-5 w-auto ${showIncompatibleWallets ? 'rotate-180' : ''} transition-all duration-200`}
                                />
                            </div>
                        )}
                    </div>
                </button>
                {showIncompatibleWallets &&
                    notCompatibleWallets.map((wallet, index) => (
                        <div key={`${index}${wallet.address}`} className="group/addressItem w-full rounded-md hover:bg-secondary-700! transition duration-200 opacity-50 cursor-not-allowed">
                            <WalletItem
                                account={wallet}
                                selectable={true}
                                network={destination}
                                selectedAddress={undefined}
                                isCompatible={false}
                            />
                        </div>
                    ))}
            </div>
        </ResizablePanel>
    )
}

export default ConnectedWallets;