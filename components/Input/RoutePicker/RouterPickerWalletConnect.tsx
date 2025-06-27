import { FC, useEffect, useState } from "react";
import { useConnectModal } from "../../WalletModal";
import { Wallet, WalletProvider } from "../../../Models/WalletProvider";
import VaulDrawer from "../../modal/vaulModal";
import { ChevronDown, Plus } from "lucide-react";
import { WalletItem } from "../../Wallet/WalletsList";
import { Network, Token } from "../../../Models/Network";
import useWallet from "../../../hooks/useWallet";
import shortenAddress from "../../utils/ShortenAddress";
import WalletIcon from "../../icons/WalletIcon";
import ConnectButton from "../../buttons/connectButton";
import { usePickerSelectedWalletStore } from "@/stores/pickerSelectedWallets";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";

const PickerWalletConnect: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const { providers, wallets } = useWallet()
    const { pickerSelectedWallets, addWallet } = usePickerSelectedWalletStore(direction)

    useEffect(() => {
        providers.forEach(provider => {
            const selectedWallet = pickerSelectedWallets?.find(w => w.provider === provider.name)
            if (!selectedWallet && provider.activeWallet) {
                addWallet({ address: provider.activeWallet?.address, provider: provider.name })
            }
        })
    }, [direction, pickerSelectedWallets])

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        await connect()
    }

    return <>
        <WalletButton wallets={wallets} onOpenModalClick={() => setOpenModal(true)} pickerSelectedWallets={pickerSelectedWallets} />
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header={`Select wallet`}
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap id="item-1" className="space-y-1 pb-6">
                <button type='button' onClick={connectWallet} className="w-full flex justify-center p-2 bg-secondary-500 rounded-md hover:bg-secondary-400">
                    <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">
                            Connect new wallet
                        </span>
                    </div>
                </button>
                {
                    providers.filter(p => p.connectedWallets?.length).map((provider, index) => {
                        const handleSelectWallet = (_: Wallet, address: string) => {
                            addWallet({ address, provider: provider.name })
                            setOpenModal(false)
                        }
                        const selectedWallet = pickerSelectedWallets?.find(w => w.provider === provider.name)

                        return (
                            <div key={index}>
                                <div className="flex justify-between items-center px-4 pt-2">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm pl-1 py-1">
                                        {provider.name}
                                    </label>
                                </div>
                                <WalletsList
                                    key={index}
                                    provider={provider}
                                    onSelect={handleSelectWallet}
                                    selectedAddress={selectedWallet?.address}
                                />
                            </div>
                        )
                    })
                }
            </VaulDrawer.Snap>
        </VaulDrawer >
    </>
}

const WalletButton: FC<{ wallets: Wallet[], pickerSelectedWallets: ReturnType<typeof usePickerSelectedWalletStore>['pickerSelectedWallets'], onOpenModalClick: () => void }> = ({ wallets, onOpenModalClick, pickerSelectedWallets }) => {

    const wallet = wallets[0]

    wallets.forEach(w => {
        const selectedWallet = pickerSelectedWallets?.find(sw => sw.provider === w.providerName)
        if (selectedWallet && selectedWallet.address && w.address !== selectedWallet.address) {
            w.address = selectedWallet.address
        }
    })

    if (wallets.length > 0) {
        return <button onClick={onOpenModalClick} type="button" className="py-1 px-2 bg-transparent flex items-center w-fit rounded-md space-x-1 relative font-semibold transform hover:bg-secondary-400 transition duration-200 ease-in-out">
            {
                wallets.length === 1 ?
                    <div className="flex gap-2 items-center text-sm text-primary-text">
                        <wallet.icon className='h-5 w-5' />
                        {
                            !wallet.isLoading && wallet.address &&
                            <p>{shortenAddress(wallet.address)}</p>
                        }
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    :
                    <WalletsIcons wallets={wallets} />
            }
        </button>
    }

    return (
        <ConnectButton>
            <div className="p-1.5 justify-self-start text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center">
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    )
}

const WalletsIcons = ({ wallets }: { wallets: Wallet[] }) => {

    const uniqueWallets = wallets.filter((wallet, index, self) => index === self.findIndex((t) => t.id === wallet.id))

    const firstWallet = uniqueWallets[0]
    const secondWallet = uniqueWallets[1]

    return (
        <div className="-space-x-2 flex">
            {
                firstWallet?.displayName &&
                <firstWallet.icon className="rounded-full border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6" />
            }
            {
                secondWallet?.displayName &&
                <secondWallet.icon className="rounded-full border-2 border-secondary-600 bg-secondary-700 shrink-0 h-6 w-6" />
            }
            {
                uniqueWallets.length > 2 &&
                <div className="h-6 w-6 shrink-0 rounded-full justify-center p-1 bg-secondary-600 text-primary-text overlfow-hidden text-xs">
                    <span><span>+</span>{uniqueWallets.length - 2}</span>
                </div>
            }
        </div>
    )
}

type Props = {
    token?: Token;
    network?: Network;
    provider?: WalletProvider | undefined;
    selectedAddress?: string;
    onSelect: (wallet: Wallet, address: string) => void;
}

const WalletsList: FC<Props> = (props) => {

    const { provider, onSelect, selectedAddress } = props
    const wallets = provider?.connectedWallets || []

    return (
        <div className="space-y-3">
            {
                wallets.length > 0 &&
                <div className="flex flex-col justify-start gap-2 rounded-xl">
                    {
                        wallets.map((wallet, index) => <WalletItem
                            key={`${index}${wallet.providerName}`}
                            wallet={wallet}
                            selectable={true}
                            onWalletSelect={(wallet: Wallet, address: string) => onSelect(wallet, address)}
                            selectedAddress={selectedAddress}
                        />)
                    }
                </div>
            }
        </div >
    )
}

export default PickerWalletConnect