import { Plus } from "lucide-react";
import shortenAddress from "../../../utils/ShortenAddress";
import { WalletProvider } from "../../../../hooks/useWallet";
import AddressIcon from "../../../AddressIcon";
import { addressFormat } from "../../../../lib/address/formatter";
import { ResolveConnectorIcon } from "../../../icons/ConnectorIcons";
import { Wallet } from "../../../../stores/walletStore";
import { Network } from "../../../../Models/Network";
import FilledCheck from "../../../icons/FilledCheck";
import WalletIcon from "../../../icons/WalletIcon";

const ConnectWalletButton = ({ provider, onClick, onConnect, connectedWallet, destination, destination_address }: { provider: WalletProvider, onClick: () => void, onConnect?: (connectedWallet: Wallet) => void, connectedWallet: Wallet | undefined, destination: Network, destination_address?: string | undefined }) => {

    const connect = async () => {
        const connectedWallet = await provider.connectWallet(destination.chain_id)
        if (connectedWallet && onConnect) onConnect(connectedWallet)
    }

    return connectedWallet ?
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between w-full pr-3">
                <div className="inline-flex items-center gap-2">
                    <WalletIcon className='w-4 h-4 text-secondary-text stroke-2' />
                    <span className="text-sm font-medium text-secondary-text">Connected Wallet</span>
                </div>
                <button
                    onClick={async () => await provider.reconnectWallet(destination.chain_id)}
                    className="text-secondary-text no-underline hover:underline hover:text-primary-text text-xs "
                >
                    Switch Wallet
                </button>
            </div>
            <button type="button" onClick={onClick} className={`w-full px-3 py-3 rounded-md hover:!bg-secondary-800 transition duration-200 ${addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                <div className={`flex items-center justify-between w-full`}>
                    <div className={`space-x-2 flex text-sm items-center`}>
                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                            <AddressIcon className="scale-150 h-9 w-9" address={connectedWallet.address} size={36} />
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="block text-sm font-medium">
                                {shortenAddress(connectedWallet.address)}
                            </div>
                            {
                                connectedWallet.connector &&
                                <div className="flex items-center gap-1.5 text-secondary-text text-sm">
                                    <connectedWallet.icon className="rounded flex-shrink-0 h-4 w-4" />
                                    <p>
                                        {connectedWallet.connector}
                                    </p>
                                </div>
                            }
                        </div>
                    </div>
                    <div className="flex h-6 items-center px-1">
                        {
                            addressFormat(connectedWallet.address, destination!) === addressFormat(destination_address!, destination!) &&
                            <FilledCheck />
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
                    <p className="text-sm font-medium text-secondary-text text-start">Connect your wallet to browse and select from your addresses</p>
                    <div className="bg-primary-700/30 border-none !text-primary py-2 rounded-lg text-base font-semibold">
                        Connect Now
                    </div>
                </div>
            </div>
        </button>
}

export default ConnectWalletButton