import { Wallet } from "lucide-react"
import { useState } from "react";
import { useAccount } from "wagmi";
import RainbowKit from "./RainbowKit"

const TransferFromWallet = () => {
    const { isConnected, isDisconnected, connector, address } = useAccount();
    return <>
        <RainbowKit>
            {
                <div className={`min-h-12 text-left space-x-2 border border-darkblue-500 bg-darkblue-700/70  flex text-sm rounded-md items-center w-full transform transition duration-200 px-2 py-1.5 hover:border-darkblue-500 hover:bg-darkblue-700 hover:shadow-xl`}>
                    <div className='flex text-primary-text flex-row items-left bg-darkblue-400 px-2 py-1 rounded-md'>
                        <Wallet className="h-6 w-6 text-primary-text" />
                    </div>
                    <div className="flex flex-col">
                        <div className="block text-sm font-medium">
                            Connect wallet
                        </div>
                        <div className="text-gray-500">
                            Connect your wallet to fetch the address
                        </div>
                    </div>
                </div>
            }
        </RainbowKit>
        {address}
    </>
}
export default TransferFromWallet