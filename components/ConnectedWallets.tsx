import WalletIcon from "./icons/WalletIcon"
import shortenAddress from "./utils/ShortenAddress"
import useWallet from "../hooks/useWallet"
import ConnectButton from "./buttons/connectButton"
import SubmitButton from "./buttons/submitButton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./shadcn/dialog"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Wallet } from "../stores/walletStore"

export const WalletsHeader = () => {
    const { wallets } = useWallet()
    const [openDialog, setOpenDialog] = useState<boolean>(false)

    if (wallets.length > 0) {
        return (
            <>
                <button type="button" aria-label="Connected wallets" onClick={() => setOpenDialog(true)} className="-mx-2 p-1.5 justify-self-start text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-none inline-flex rounded-lg items-center">
                    <WalletsIcons wallets={wallets} />
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

const WalletsIcons = ({ wallets }: { wallets: Wallet[] }) => {
    const firstWallet = wallets[0]
    const secondWallet = wallets[1]

    return (
        <div className="-space-x-2 flex">
            {
                firstWallet?.connector &&
                <firstWallet.icon className="rounded-full border-2 border-secondary-600 bg-secondary-700 flex-shrink-0 h-6 w-6" />
            }
            {
                secondWallet?.connector &&
                <secondWallet.icon className="rounded-full border-2 border-secondary-600 bg-secondary-700 flex-shrink-0 h-6 w-6" />
            }
            {
                wallets.length > 2 &&
                <div className="h-6 w-6 flex-shrink-0 rounded-full justify-center p-1 bg-secondary-600 text-primary-text overlfow-hidden text-xs">
                    <span><span>+</span>{wallets.length - 2}</span>
                </div>
            }
        </div>
    )
}

export const WalletsMenu = () => {
    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const { wallets } = useWallet()
    const wallet = wallets[0]
    if (wallets.length > 0) {
        return (
            <>
                <button onClick={() => setOpenDialog(true)} type="button" className="py-3 px-4 bg-secondary-700 flex items-center w-full rounded-md space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-500 hover:bg-secondary-600 transition duration-200 ease-in-out">
                    {
                        wallets.length === 1 ?
                            <div className="flex gap-4 items-start">
                                <wallet.icon className='h-5 w-5' />
                                <p>{shortenAddress(wallet.address)}</p>
                            </div>
                            :
                            <>
                                <div className="flex justify-center w-full">
                                    Connected wallets
                                </div>
                                <div className="place-items-end absolute left-2.5">
                                    <WalletsIcons wallets={wallets} />
                                </div>
                            </>
                    }
                </button>
                <ConnectedWalletsDialog openDialog={openDialog} setOpenDialog={setOpenDialog} />
            </>
        )
    }

    return (
        <ConnectButton>
            <SubmitButton text_align="center" icon={<WalletIcon className='stroke-2 w-6 h-6' strokeWidth={2} />} className="bg-primary/20 border-none !text-primary !px-4" type="button" isDisabled={false} isSubmitting={false}>
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
                                <div className="flex space-x-4 items-center">
                                    {
                                        wallet.connector &&
                                        <div className="inline-flex items-center relative">
                                            <wallet.icon className="w-8 h-8 p-0.5 rounded-full bg-secondary-800 border border-secondary-400" />
                                        </div>
                                    }
                                    <p>{shortenAddress(wallet.address)}</p>
                                </div>
                                <button onClick={() => { disconnectWallet(wallet.providerName); wallets.length === 1 && setOpenDialog(false) }} className="p-1 hover:bg-secondary-700 text-xs text-secondary-text hover:opacity-75">
                                    Disconnect
                                </button>
                            </div>
                        ))
                    }
                </div>
                <DialogFooter>
                    <ConnectButton onClose={() => setOpenDialog(false)}>
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
