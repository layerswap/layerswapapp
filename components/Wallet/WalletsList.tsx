import { Plus } from "lucide-react";
import useWallet from "../../hooks/useWallet";
import shortenAddress from "../utils/ShortenAddress";
import ConnectButton from "../buttons/connectButton";

const WalletsList = () => {
    const { wallets, disconnectWallet } = useWallet()

    return (
        <div className="space-y-1">
            <div className="flex items-end justify-end w-full p-1">
                <ConnectButton>
                    <div className="flex items-center text-secondary-text hover:text-secondary-text/80 gap-1 px-3 py-1">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">
                            Add wallet
                        </span>
                    </div>
                </ConnectButton>
            </div>
            <div className="flex flex-col justify-start space-y-2">
                {
                    wallets.map((wallet, index) => (
                        <div key={index} className="w-full relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                            <div className="flex space-x-4 items-center">
                                {
                                    wallet.connector &&
                                    <div className="inline-flex items-center relative">
                                        <wallet.icon className="w-8 h-8 p-0.5 rounded-full bg-secondary-800 border border-secondary-400" />
                                    </div>
                                }
                                <p>{shortenAddress(wallet.address)}</p>
                            </div>
                            <button onClick={() => { disconnectWallet(wallet.providerName); }} className="p-1 hover:bg-secondary-700 text-xs text-secondary-text hover:opacity-75">
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