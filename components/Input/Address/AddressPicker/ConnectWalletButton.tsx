import { RefreshCw } from "lucide-react";
import { WalletProvider } from "../../../../hooks/useWallet";
import { addressFormat } from "../../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../../icons/ConnectorIcons";
import { Wallet } from "../../../../stores/walletStore";
import { Network } from "../../../../Models/Network";
import FilledCheck from "../../../icons/FilledCheck";
import AddressWithIcon from "./AddressWithIcon";
import { AddressGroup } from ".";
import { FC, useState } from "react";

type Props = {
    provider: WalletProvider,
    onClick: (address: string) => void,
    onConnect?: () => void,
    connectedWallet: Wallet | undefined,
    destination: Network,
    destination_address?: string | undefined
}

const ConnectWalletButton: FC<Props> = ({ provider, onClick, onConnect, connectedWallet, destination, destination_address }) => {

    const [isLoading, setIsLoading] = useState(false)
    const connectedWallets = provider.connectedWallets

    const connect = async () => {
        setIsLoading(true)
        await provider.connectWallet({ chain: destination.chain_id })
        if (onConnect) onConnect()
        setIsLoading(false)
    }

    const disconnect = async () => {
        setIsLoading(true)
        await provider.disconnectWallets()
        if (onConnect) onConnect()
        setIsLoading(false)
    }

    return provider.connectedWallets?.length ?
        <>
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
                                    <button type="button" onClick={() => onClick(address)} className={`group/addressItem w-full px-3 py-3 rounded-md hover:!bg-secondary-700 transition duration-200 ${address && addressFormat(address, destination!) === addressFormat(destination_address!, destination!) && 'bg-secondary-800'}`}>
                                        <div className={`flex items-center justify-between w-full`}>
                                            <AddressWithIcon addressItem={addressItem} connectedWallet={wallet} destination={destination} />
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
        </>
        :
        <button typeof="button" onClick={connect} type="button" className={`py-5 px-6 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl ${isLoading && 'cursor-progress opacity-80'}`}>
            <div className="flex flex-row justify-between gap-9 items-stretch">
                <ResolveConnectorIcon
                    connector={provider.name}
                    iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                    className="grid grid-cols-2 gap-1 min-w-fit"
                />
                <div className="h-full space-y-2">
                    <p className="text-sm font-medium text-secondary-text text-start">Connect your wallet to select a destination address</p>
                    <div className="bg-primary-700/30 border-none !text-primary py-2 rounded-lg text-base font-semibold">
                        {
                            isLoading ?
                                <div className="flex items-center gap-1 justify-center">
                                    <RefreshCw className="h-3 w-auto animate-spin" />
                                    <span className="ml-1">Connecting...</span>
                                </div>
                                :
                                <>Connect Now</>
                        }
                    </div>
                </div>
            </div>
        </button>
}

export default ConnectWalletButton