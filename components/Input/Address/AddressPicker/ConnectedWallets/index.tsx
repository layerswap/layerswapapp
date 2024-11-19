
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { WalletProvider } from "../../../../../hooks/useWallet";
import { addressFormat } from "../../../../../lib/address/formatter";
import { Wallet } from "../../../../../stores/walletStore";
import { Network } from "../../../../../Models/Network";
import FilledCheck from "../../../../icons/FilledCheck";
import AddressWithIcon from "../AddressWithIcon";
import { FC, useState } from "react";
import { AddressGroup } from "..";
import ResizablePanel from "../../../../ResizablePanel";

type Props = {
    provider: WalletProvider,
    wallets: Wallet[],
    onClick: (address: string, wallet: Wallet) => void,
    onConnect?: () => void,
    destination: Network,
    destination_address?: string | undefined
}

const ConnectedWallets: FC<Props> = ({ provider, wallets, onClick, onConnect, destination, destination_address }) => {

    const [isLoading, setIsLoading] = useState(false)
    const [showIncompatibleWallets, setShowIncompatibleWallets] = useState(false)
    const connectedWallets = provider.connectedWallets?.filter(wallet => !wallet.isNotAvailable)

    const connect = async () => {
        setIsLoading(true)
        await provider.connectWallet({ chain: destination.chain_id })
        if (onConnect) onConnect()
        setIsLoading(false)
    }

    const notCompatibleWallets = wallets.filter(wallet => wallet.providerName !== provider.name || wallet.isNotAvailable)

    return <>

        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
                <p className="text-sm font-medium text-secondary-text">Connected Wallet</p>
                <button
                    onClick={connect}
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
                connectedWallets && connectedWallets.map((wallet, index) => {
                    return <span key={index}>
                        {
                            wallet.addresses?.map((address) => {
                                const addressItem = {
                                    address: address,
                                    group: AddressGroup.ConnectedWallet,
                                }

                                return <div key={address} className="flex flex-col gap-2">
                                    <button type="button" onClick={() => onClick(address, wallet)} className={`group/addressItem w-full px-3 py-3 rounded-md hover:!bg-secondary-700 transition duration-200 ${address && addressFormat(address, destination!) === addressFormat(destination_address!, destination!) && 'bg-secondary-800'}`}>
                                        <div className={`flex items-center justify-between w-full`}>
                                            <AddressWithIcon addressItem={addressItem} connectedWallet={wallet} network={destination} />
                                            <div className="flex h-6 items-center px-1">
                                                {
                                                    addressFormat(address, destination!) === addressFormat(destination_address!, destination!) &&
                                                    <FilledCheck className="text-primary" />
                                                }
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            })
                        }
                    </span>
                })
            }
        </div>

        {
            notCompatibleWallets.length > 0 &&
            <ResizablePanel>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-sm font-medium text-secondary-text"><span>Not compatible with</span> <span>{destination.display_name}</span></p>
                        <button
                            onClick={() => { setShowIncompatibleWallets(!showIncompatibleWallets) }}
                            disabled={isLoading}
                            className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200"
                        >
                            {
                                isLoading ?
                                    <RefreshCw className="h-3 w-auto animate-spin" />
                                    :
                                    <ChevronDown className={`h-5 w-auto ${showIncompatibleWallets && 'rotate-180'} transition-all duration-200`} />
                            }
                        </button>
                    </div>
                    {
                        showIncompatibleWallets && notCompatibleWallets && notCompatibleWallets.map((wallet, index) => {
                            return <span key={index}>
                                {
                                    wallet.addresses?.map((address) => {
                                        const addressItem = {
                                            address: address,
                                            group: AddressGroup.ConnectedWallet,
                                        }

                                        return <div key={address} className="flex flex-col gap-2">
                                            <div className={`group/addressItem w-full px-3 py-3 rounded-md hover:!bg-secondary-700 transition duration-200 opacity-50`}>
                                                <AddressWithIcon addressItem={addressItem} connectedWallet={wallet} network={destination} />
                                            </div>
                                        </div>
                                    })
                                }
                            </span>
                        })
                    }
                </div>
            </ResizablePanel>
        }

    </>
}

export default ConnectedWallets;