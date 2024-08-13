import { Plus } from "lucide-react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import ConnectButton from "../buttons/connectButton";

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
                        <div key={index} className="w-full relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                            <div className="flex space-x-4 items-center">
                                {
                                    wallet.connector &&
                                    <div className="inline-flex items-center relative">
                                        <wallet.icon className="w-9 h-9 p-0.5 rounded-md bg-secondary-800" />
                                    </div>
                                }
                                <div>
                                    {
                                        !wallet.isLoading && wallet.address && 
                                        <p className="text-sm">{shortenAddress(wallet.address)}</p>
                                    }
                                    <p className="text-xs text-secondary-text">
                                        {wallet.connector}
                                    </p>
                                </div>
                            </div>
                            <button onClick={wallet.disconnect} className="text-xs text-secondary-text hover:opacity-75">
                                Disconnect
                            </button>
                        </div>
                    ))
                }
            </div>
        </div>
    )
}
export default WalletsList