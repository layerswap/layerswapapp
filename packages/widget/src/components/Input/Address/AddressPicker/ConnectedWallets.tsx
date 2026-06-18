
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { Network } from "@/Models/Network";
import { FC, useState } from "react";
import ResizablePanel from "@/components/Common/ResizablePanel";
import { SelectAccountProps, Wallet, WalletConnectionProvider } from "@/types/wallet";
import WalletIcon from "@/components/Icons/WalletIcon";
import { WalletItem } from "@/components/Wallet/WalletComponents/WalletsList";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { AddressItem } from ".";
import { Partner } from "@/Models/Partner";
import AddressIcon from "@/components/Common/AddressIcon";
import AddressWithIcon from "./AddressWithIcon";

type Props = {
    provider: WalletConnectionProvider,
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
    notCompatibleAddresses?: AddressItem[],
    destination: Network,
    partner?: Partner,
    isLoading?: boolean,
}

const MAX_ICONS = 3

export const NotCompatibleWallets: FC<NotCompatibleWalletsProps> = ({ notCompatibleWallets, notCompatibleAddresses = [], destination, partner, isLoading }) => {
    const total = notCompatibleWallets.length + notCompatibleAddresses.length
    const [showIncompatibleWallets, setShowIncompatibleWallets] = useState(total === 1)

    const walletIcons = notCompatibleWallets.slice(0, MAX_ICONS)
    const addressIcons = notCompatibleAddresses.slice(0, Math.max(0, MAX_ICONS - walletIcons.length))
    const hiddenIconsCount = total - walletIcons.length - addressIcons.length

    if (!total) return null

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
                            <div className="space-x-1 flex items-center">
                                {walletIcons.map((wallet) => (
                                    <div key={wallet.address} className="inline-flex items-center relative">
                                        <wallet.icon className="w-4 h-4 rounded-xs bg-secondary-800" />
                                    </div>
                                ))}
                                {addressIcons.map((item) => (
                                    <div key={item.address} className="inline-flex items-center relative">
                                        <AddressIcon className="rounded-xs" address={item.address} size={16} network={destination} plain />
                                    </div>
                                ))}
                                {hiddenIconsCount > 0 && (
                                    <div className="w-4 h-4 bg-secondary-600 text-primary-text text-[8px] rounded-full flex items-center justify-center border-2 border-background">
                                        <span>+{hiddenIconsCount}</span>
                                    </div>
                                )}
                                <ChevronDown
                                    className={`h-5 w-auto ${showIncompatibleWallets ? 'rotate-180' : ''} transition-all duration-200`}
                                />
                            </div>
                        )}
                    </div>
                </button>
                {showIncompatibleWallets && <>
                    {notCompatibleWallets.map((wallet, index) => (
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
                    {notCompatibleAddresses.map((item, index) => (
                        <div key={`${index}${item.address}`} className="group/addressItem w-full rounded-md p-3 bg-secondary-500 transition duration-200 opacity-50 cursor-not-allowed pointer-events-none">
                            <AddressWithIcon addressItem={item} partner={partner} network={destination} />
                        </div>
                    ))}
                </>}
            </div>
        </ResizablePanel>
    )
}

export default ConnectedWallets;