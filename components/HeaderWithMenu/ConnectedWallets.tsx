import AddressIcon from "../AddressIcon"
import CoinbaseIcon from "../icons/Wallets/Coinbase"
import MetaMaskIcon from "../icons/Wallets/MetaMask"
import RainbowIcon from "../icons/Wallets/Rainbow"
import WalletConnectIcon from "../icons/Wallets/WalletConnect"
import WalletIcon from "../icons/WalletIcon"
import shortenAddress from "../utils/ShortenAddress"
import BitKeep from "../icons/Wallets/BitKeep"
import Argent from "../icons/Wallets/Argent"
import useWallet from "../../hooks/useWallet"
import ConnectButton from "../buttons/connectButton"
import SubmitButton from "../buttons/submitButton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../shadcn/dialog"
import { useState } from "react"
import { Plus } from "lucide-react"

export const WalletsHeader = () => {
    const { wallets } = useWallet()
    const [openDialog, setOpenDialog] = useState<boolean>(false)

    if (wallets.some(w => w.isConnected === true)) {
        return (
            <>
                <button onClick={() => setOpenDialog(true)} className="-mx-2 p-1.5 justify-self-start text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-none inline-flex rounded-lg items-center">
                    <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
                </button>
                <ConnectedWalletsDialog openDialog={openDialog} setOpenDialog={setOpenDialog} />
            </>
        )
    }

    return (
        <ConnectButton>
            <div className="-mx-2 p-1.5 justify-self-start text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-none inline-flex rounded-lg items-center">
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    )
}

export const WalletsMenu = () => {
    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const { wallets } = useWallet()

    if (wallets.some(w => w.isConnected === true)) {
        return (
            <>
                <SubmitButton onClick={() => setOpenDialog(true)} text_align="center" icon={<WalletIcon className='h-5 w-5' strokeWidth={2} />} className="bg-secondary-600 border-none !text-primary-text !px-4" type="button" isDisabled={false} isSubmitting={false}>
                    Connected wallets
                </SubmitButton>
                <ConnectedWalletsDialog openDialog={openDialog} setOpenDialog={setOpenDialog} />
            </>
        )
    }

    return (
        <ConnectButton>
            <SubmitButton text_align="center" icon={<WalletIcon className='h-5 w-5' strokeWidth={2} />} className="bg-primary/20 border-none !text-primary !px-4" type="button" isDisabled={false} isSubmitting={false}>
                Connect a wallet
            </SubmitButton>
        </ConnectButton>
    )
}

const ConnectedWalletsDialog = ({ openDialog, setOpenDialog }: { openDialog: boolean, setOpenDialog: (open: boolean) => void }) => {
    const { wallets, disconnectWallet } = useWallet()

    return (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-center">Wallets</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col justify-start space-y-2">
                    {
                        wallets.map((wallet, index) => (
                            <div key={index} className="w-full relative items-center justify-between gap-2 flex rounded-md outline-none bg-secondary-700 text-primary-text p-3 border border-secondary-500 ">
                                <div className="flex gap-4 items-center">
                                    <div className="inline-flex items-center relative">
                                        <AddressIcon address={wallet.address} size={20} />
                                        {
                                            wallet.connector && <span className="absolute -bottom-1 -right-2 ml-1 shadow-sm text-[10px] leading-4 font-semibold text-primary-text">
                                                <ResolveWalletIcon connector={wallet.connector.toLowerCase()} className="w-4 h-4 border-2 border-secondary-600 rounded-full bg-primary-text" />
                                            </span>
                                        }
                                    </div>
                                    <p>{shortenAddress(wallet.address)}</p>
                                </div>
                                <button onClick={() => disconnectWallet(wallet.network)} className="p-1 hover:bg-secondary-700 text-xs text-secondary-text hover:opacity-75">
                                    Disconnect
                                </button>
                            </div>
                        ))
                    }
                </div>
                <DialogFooter>
                    <ConnectButton>
                        <div className="text-secondary-text hover:text-secondary-text/80 flex items-center gap-1 justify-end w-fit">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">
                                Link a new wallet
                            </span>
                        </div>
                    </ConnectButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
