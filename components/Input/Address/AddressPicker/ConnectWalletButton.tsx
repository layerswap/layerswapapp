import { Link2Off, Plus } from "lucide-react";
import { WalletProvider } from "../../../../hooks/useWallet";
import { addressFormat } from "../../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../../icons/ConnectorIcons";
import { Wallet } from "../../../../stores/walletStore";
import { Network } from "../../../../Models/Network";
import FilledCheck from "../../../icons/FilledCheck";
import AddressWithIcon from "./AddressWithIcon";
import { AddressItem } from ".";
import { FC } from "react";

type Props = {
    addresses: AddressItem[] | undefined,
    provider: WalletProvider,
    onClick: () => void,
    onConnect?: (connectedWallet: Wallet) => void,
    connectedWallet: Wallet | undefined,
    destination: Network,
    destination_address?: string | undefined
}

const ConnectWalletButton: FC<Props> = ({ addresses, provider, onClick, onConnect, connectedWallet, destination, destination_address }) => {

    const connect = async () => {
        const connectedWallet = await provider.connectWallet(destination.chain_id)
        if (connectedWallet && onConnect) onConnect(connectedWallet)
    }

    const addressItem = connectedWallet && addresses?.find(a => addressFormat(a.address, destination) === addressFormat(connectedWallet.address, destination))

    return addressItem ?
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
                <p className="text-sm font-medium text-secondary-text">Connected Wallet</p>
                <button
                    onClick={async () => await provider.reconnectWallet(destination.chain_id)}
                    className="text-secondary-text hover:text-primary-text text-xs rounded-lg flex items-center gap-1.5 transition-colors duration-200"
                >
                    <Link2Off className="h-3.5 w-auto" />
                    <p>Switch</p>
                </button>
            </div>
            <button type="button" onClick={onClick} className={`w-full px-3 py-3 rounded-md hover:!bg-secondary-800 transition duration-200 ${addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                <div className={`flex items-center justify-between w-full`}>
                    <AddressWithIcon addressItem={addressItem} connectedWallet={connectedWallet} />
                    <div className="flex h-6 items-center px-1">
                        {
                            addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) &&
                            <FilledCheck className="text-primary" />
                        }
                    </div>
                </div>
            </button>
        </div>
        :
        <button typeof="button" onClick={connect} type="button" className="py-5 px-6 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl">
            <div className="flex flex-row justify-between gap-9 items-stretch">
                <ResolveConnectorIcon
                    connector={provider.name}
                    iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                    className="grid grid-cols-2 gap-1 min-w-fit"
                >
                    <div className="w-10 h-10 bg-secondary-400 rounded-lg flex-col justify-center items-center inline-flex">
                        <Plus className="h-6 w-6 text-secondary-text" />
                    </div>
                </ResolveConnectorIcon>
                <div className="h-full space-y-2">
                    <p className="text-sm font-medium text-secondary-text text-start">Connect your wallet to select a destination address</p>
                    <div className="bg-primary-700/30 border-none !text-primary py-2 rounded-lg text-base font-semibold">
                        Connect Now
                    </div>
                </div>
            </div>
        </button>
}

export default ConnectWalletButton