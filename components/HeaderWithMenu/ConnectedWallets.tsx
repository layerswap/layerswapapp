import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import AddressIcon from "../AddressIcon"
import CoinbaseIcon from "../icons/Wallets/Coinbase"
import MetaMaskIcon from "../icons/Wallets/MetaMask"
import RainbowIcon from "../icons/Wallets/Rainbow"
import WalletConnectIcon from "../icons/Wallets/WalletConnect"

import WalletIcon from "../icons/WalletIcon"
import shortenAddress from "../utils/ShortenAddress"
import BitKeep from "../icons/Wallets/BitKeep"
import Argent from "../icons/Wallets/Argent"
import { FC, useCallback } from "react"


export const RainbowKitConnectWallet = ({ isButton, isMobile, isConnected }: { isButton?: boolean, isMobile?: boolean, isConnected?: boolean }) => {

    const { connector } = useAccount()

    return <ConnectButton.Custom>
        {({ openConnectModal, account, mounted, chain, openAccountModal, openChainModal }) => {
            const connected = !!(mounted && account && chain)
            const handleClick = () => {
                if (chain?.unsupported) {
                    return openChainModal()
                } else if (connected) {
                    return openAccountModal()
                } else {
                    openConnectModal()
                }
            }

            return <button onClick={handleClick} type="button" className={`-mx-2 p-1.5 justify-self-start text-primary-text hover:bg-secondary-500 hover:text-white focus:outline-none inline-flex rounded-lg items-center`}>
                {connected ?
                    <div className="mx-0.5">
                        <div className="font-bold grow flex space-x-2">
                            <div className="inline-flex items-center relative">
                                <AddressIcon address={account.address} size={25} />
                                {
                                    connector && <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-white">
                                        <ResolveWalletIcon connector={connector?.name} className="w-5 h-5 border-2 border-secondary-600 rounded-full bg-primary-text" />
                                    </span>
                                }
                            </div>
                        </div>
                    </div>
                    : <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
                }
            </button>
        }}
    </ConnectButton.Custom >
}

export const MenuRainbowKitConnectWallet = ({ isButton, isMobile, isConnected }: { isButton?: boolean, isMobile?: boolean, isConnected?: boolean }) => {
    const { connector } = useAccount()
    
    return <ConnectButton.Custom>
        {({ openConnectModal, account, mounted, chain, openAccountModal, openChainModal }) => {
            const connected = !!(mounted && account && chain)
            const handleClick = () => {
                if (chain?.unsupported) {
                    return openChainModal()
                } else if (connected) {
                    return openAccountModal()
                } else {
                    openConnectModal()
                }
            }

            return <button onClick={handleClick} type="button" className={`${!isMobile ? "h-24 w-24" : "h-20 w-14"} mx-2 w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}>
                {connected ?
                    <div className="mx-0.5">
                        <div className="flex-col items-center">
                            <div className="inline-flex items-center relative">
                                <AddressIcon address={account.address} size={25} />
                                {
                                    connector && <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-white">
                                        <ResolveWalletIcon connector={connector?.name} className="w-5 h-5 border-2 border-secondary-600 rounded-full bg-primary-text" />
                                    </span>
                                }
                            </div>
                            <p>{shortenAddress(account.address)}</p>
                        </div>
                    </div>
                    : <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
                }
            </button>
        }}
    </ConnectButton.Custom>
}

export const ResolveWalletIcon = ({ connector, className }: { connector: string, className: string }) => {
    switch (connector) {
        case KnownKonnectors.MetaMask:
            return <MetaMaskIcon className={className} />
        case KnownKonnectors.Coinbase:
            return <CoinbaseIcon className={className} />
        case KnownKonnectors.WalletConnect:
            return <WalletConnectIcon className={className} />
        case KnownKonnectors.Rainbow:
            return <RainbowIcon className={className} />
        case KnownKonnectors.BitKeep:
            return <BitKeep className={className} />
        case KnownKonnectors.Argent:
            return <Argent className={className} />
        default:
            return <></>
    }
}

const KnownKonnectors = {
    MetaMask: 'MetaMask',
    WalletConnect: 'WalletConnect',
    Coinbase: 'Coinbase Wallet',
    Rainbow: 'Rainbow',
    BitKeep: 'BitKeep',
    Argent: 'Argent',
}
