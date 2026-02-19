import WalletIcon from "../icons/WalletIcon"
import { Address } from "@/lib/address"
import useWallet from "../../hooks/useWallet"
import ConnectButton from "../buttons/connectButton"
import { useState } from "react"
import WalletsList from "./WalletsList"
import VaulDrawer from "../modal/vaulModal"
import { Wallet } from "../../Models/WalletProvider"

export const WalletsHeader = () => {
    const { wallets } = useWallet()

    if (wallets.length > 0) {
        return (
            <WalletsHeaderWalletsList wallets={wallets} />
        )
    }

    return (
        <ConnectButton>
            <div className="p-1.5 max-sm:p-2 active:animate-press-down justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center">
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    )
}

const WalletsHeaderWalletsList = ({ wallets }: { wallets: Wallet[] }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)
    return <>
        <button type="button" onClick={() => setOpenModal(true)} className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down">
            <WalletsIcons wallets={wallets} />
        </button>
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header={`Connected wallets`}
            modalId="connectedWallets"
            zLevel={1}
        >
            <VaulDrawer.Snap id="item-1">
                <WalletsList wallets={wallets} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    </>
}
type WalletsIconsProps = {
    wallets: {
        id: string;
        displayName?: string;
        icon: (props: any) => React.JSX.Element;
    }[]
}
export const WalletsIcons = ({ wallets }: WalletsIconsProps) => {

    const uniqueWallets = wallets.filter((wallet, index, self) => index === self.findIndex((t) => t.id === wallet.id))

    const firstWallet = uniqueWallets[0]
    const secondWallet = uniqueWallets[1]

    return (
        <div className="-space-x-2 flex">
            {
                firstWallet?.displayName &&
                <firstWallet.icon className="rounded-md border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6" />
            }
            {
                secondWallet?.displayName &&
                <secondWallet.icon className="rounded-md border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6" />
            }
            {
                uniqueWallets.length > 2 &&
                <div className="h-6 w-6 shrink-0 rounded-md justify-center p-1 bg-secondary-600 text-primary-text overlfow-hidden text-xs">
                    <span><span>+</span>{uniqueWallets.length - 2}</span>
                </div>
            }
        </div>
    )
}

export const WalletsMenu = () => {
    const { wallets } = useWallet()

    if (wallets.length > 0) {
        return (
            <WalletsMenuWalletsList wallets={wallets} />
        )
    }

    return (
        <ConnectButton>
            <div className="active:animate-press-down border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-primary/40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-xl transform hover:brightness-125 transition duration-200 ease-in-out py-3 md:px-3 bg-primary/20 border-none text-primary! px-4!" >
                <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                    <WalletIcon className="h-6 w-6" strokeWidth="2" />
                </span>
                <span className="grow text-center">Connect a wallet</span>
            </div>
        </ConnectButton>
    )
}

const WalletsMenuWalletsList = ({ wallets }: { wallets: Wallet[] }) => {
    const wallet = wallets[0]
    const [openModal, setOpenModal] = useState<boolean>(false)

    return <>
        <button onClick={() => setOpenModal(true)} type="button" className="py-3 px-4 bg-secondary-500 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-primary-900 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-500 hover:bg-secondary-400 transition duration-200 ease-in-out outline-hidden">
            {
                wallets.length === 1 ?
                    <div className="flex gap-4 items-start text-primary-text">
                        <wallet.icon className='h-5 w-5' />
                        {!wallet.isLoading && wallet.address && <p>{new Address(wallet.address, null, wallet.providerName).toShortString()}</p>}
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
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header={`Connected wallets`}
            modalId="connectedWallets"
            zLevel={1}
        >
            <VaulDrawer.Snap id="item-1">
                <WalletsList wallets={wallets} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    </>
}