import { FC, useMemo, useState } from "react";
import { useConnectModal } from "@/components/WalletModal";
import { Wallet, WalletProvider } from "@/Models/WalletProvider";
import VaulDrawer from "@/components/modal/vaulModal";
import { ChevronDown, Plus } from "lucide-react";
import { WalletItem } from "@/components/Wallet/WalletsList";
import { Network, Token } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import shortenAddress from "@/components/utils/ShortenAddress";
import WalletIcon from "@/components/icons/WalletIcon";
import ConnectButton from "@/components/buttons/connectButton";
import useSelectedWalletStore from "@/context/selectedAccounts/pickerSelectedWallets";
import { SwapDirection, SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { WalletsIcons } from "@/components/Wallet/ConnectedWallets";
import { useFormikContext } from "formik";
import { isValidAddress } from "@/lib/address/validator";

const PickerWalletConnect: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();
    const { providers } = useWallet()
    const { pickerSelectedWallets, addSelectedWallet } = useSelectedWalletStore(direction)

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        const result = await connect()
        if (result) addSelectedWallet({ wallet: result, address: result?.address, providerName: result.providerName })
    }

    const providersWithManualAdded = useMemo(() => {

        return providers.map(provider => {
            const selectedWallet = pickerSelectedWallets?.find(w => w.providerName === provider.name)

            if (selectedWallet) {
                const manualAddedWallet: Wallet | null = (!selectedWallet?.wallet && selectedWallet.address) ? {
                    address: selectedWallet?.address || '',
                    providerName: selectedWallet?.providerName || '',
                    id: selectedWallet?.providerName || '',
                    icon: WalletIcon,
                    isActive: true,
                    displayName: 'Manual Wallet',
                    addresses: [selectedWallet?.address || ''],
                } : null

                const connectedWallets = provider.connectedWallets || []
                if (manualAddedWallet) {
                    return { ...provider, connectedWallets: [manualAddedWallet, ...connectedWallets] }
                }
            }

            return provider
        })
    }, [providers, pickerSelectedWallets])


    const walletsWithManualAdded = useMemo(() => {

        let connectedWallets: Wallet[] = [];
        providersWithManualAdded.forEach((provider) => {
            const w = provider.connectedWallets
            connectedWallets = w ? [...connectedWallets, ...w] : [...connectedWallets];
        });
        return connectedWallets;
    }, [providersWithManualAdded])

    return <>
        <WalletButton wallets={walletsWithManualAdded} onOpenModalClick={() => setOpenModal(true)} pickerSelectedWallets={pickerSelectedWallets} />
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header='Select wallet'
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
                    providersWithManualAdded.filter(p => p.connectedWallets?.length).map((provider, index) => {
                        const handleSelectWallet = (wallet: Wallet, address: string) => {
                            if (direction == 'to' && isValidAddress(address, values.to)) setFieldValue(`destination_address`, address)
                            addSelectedWallet({ wallet, address, providerName: provider.name })
                            setOpenModal(false)
                        }
                        const selectedWallet = pickerSelectedWallets?.find(w => w.providerName === provider.name)

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
                                    selectedWallet={selectedWallet}
                                />
                            </div>
                        )
                    })
                }
            </VaulDrawer.Snap>
        </VaulDrawer >
    </>
}

const WalletButton: FC<{ wallets: Wallet[], pickerSelectedWallets: ReturnType<typeof useSelectedWalletStore>['pickerSelectedWallets'], onOpenModalClick: () => void }> = ({ wallets, onOpenModalClick, pickerSelectedWallets }) => {

    const mappedWallets = useMemo(() => wallets.map(w => {
        const selectedWallet = pickerSelectedWallets?.find(sw => sw?.providerName === w.providerName)
        if (selectedWallet && selectedWallet.address && w.address !== selectedWallet.address) {
            return { ...w, address: selectedWallet.address }
        }
        return w
    }), [wallets, pickerSelectedWallets])

    const firstWallet = useMemo(() => mappedWallets[0], [mappedWallets])

    if (mappedWallets.length > 0) {
        return <button onClick={onOpenModalClick} type="button" className="py-1 px-2 bg-transparent flex items-center w-fit rounded-md space-x-1 relative font-semibold transform hover:bg-secondary-400 transition duration-200 ease-in-out">
            {
                mappedWallets.length === 1 ?
                    <div className="flex gap-2 items-center text-sm text-primary-text">
                        <firstWallet.icon className='h-5 w-5' />
                        {
                            !firstWallet.isLoading && firstWallet.address &&
                            <p>{shortenAddress(firstWallet.address)}</p>
                        }
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    :
                    <WalletsIcons wallets={mappedWallets} />
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


type Props = {
    token?: Token;
    network?: Network;
    provider?: WalletProvider | undefined;
    selectedWallet?: ReturnType<typeof useSelectedWalletStore>['pickerSelectedWallet'];
    onSelect: (wallet: Wallet, address: string) => void;
}

const WalletsList: FC<Props> = (props) => {

    const { provider, onSelect, selectedWallet } = props
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
                            selectedAddress={selectedWallet?.address}
                        />)
                    }
                </div>
            }
        </div >
    )
}

export default PickerWalletConnect