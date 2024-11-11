import { Plus } from "lucide-react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import ConnectButton from "../buttons/connectButton";
import AddressIcon from "../AddressIcon";

const WalletsList = () => {
    const { wallets } = useWallet()

    return (
        <div className="space-y-3">
            <ConnectButton className="w-full flex justify-center p-2 bg-secondary-700 rounded-md hover:bg-secondary-600">
                <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">
                        Connect new wallet
                    </span>
                </div>
            </ConnectButton>
            <div className="flex flex-col justify-start space-y-3">
                {
                    wallets.map((wallet, index) => (
                        <div key={index} className="rounded-md outline-none bg-secondary-800 text-primary-tex border border-secondary-500">
                            <div className="w-full relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3  ">
                                <div className="flex space-x-4 items-center">
                                    {
                                        wallet.connector &&
                                        <div className="inline-flex items-center relative">
                                            {
                                                wallet.iconbase64 ?
                                                    <img alt={wallet.connector} src={wallet.iconbase64} className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                                    : <wallet.icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                            }

                                        </div>
                                    }
                                    {
                                        wallet.addresses.length > 1 ?
                                            <div>
                                                <span className="text-base">{wallet.connector}</span>
                                            </div>
                                            : <div>
                                                {
                                                    !wallet.isLoading && wallet.address &&
                                                    <span className="text-sm">{shortenAddress(wallet.address)}</span>
                                                }
                                                <p className="text-xs text-secondary-text">
                                                    {wallet.connector}
                                                </p>
                                            </div>
                                    }

                                </div>
                                <button onClick={wallet.disconnect} className="text-xs text-secondary-text hover:opacity-75">
                                    Disconnect
                                </button>
                            </div>
                            {wallet.addresses.length > 1 &&
                                <div className="w-full grow p-3 pt-2 space-y-2 border-t border-secondary-500">
                                    {
                                        wallet.addresses.map((address, index) => (
                                            <div key={index} className="flex space-x-4 items-center">

                                                <div className="w-9">
                                                    <div className="flex bg-secondary-400  items-center justify-center rounded-md h-4 overflow-hidden w-4 m-auto">
                                                        <AddressIcon className="scale-150 h-4 w-4 p-0.5" address={address} size={16} />
                                                    </div>
                                                </div>

                                                <div>
                                                    {
                                                        !wallet.isLoading && wallet.address &&
                                                        <p className="text-sm text-secondary-text">{shortenAddress(address)}</p>
                                                    }
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>}
                        </div>
                    ))
                }
            </div>
        </div>
    )
}
export default WalletsList