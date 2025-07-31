import { FC, useMemo, useState } from "react";
import { useConnectModal } from "@/components/WalletModal";
import { Wallet } from "@/Models/WalletProvider";
import VaulDrawer from "@/components/modal/vaulModal";
import { ChevronDown, Plus } from "lucide-react";
import { WalletItem } from "@/components/Wallet/WalletsList";
import { Network, Token } from "@/Models/Network";
import shortenAddress from "@/components/utils/ShortenAddress";
import WalletIcon from "@/components/icons/WalletIcon";
import ConnectButton from "@/components/buttons/connectButton";
import { SwapDirection, SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { WalletsIcons } from "@/components/Wallet/ConnectedWallets";
import { useFormikContext } from "formik";
import { isValidAddress } from "@/lib/address/validator";
import { BalanceAccount, useBalanceAccounts, useUpdateBalanceAccount } from "@/context/balanceAccounts";

const PickerWalletConnect: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const balanceAccounts = useBalanceAccounts(direction)
    const selectBalanceAccount = useUpdateBalanceAccount(direction)

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        const result = await connect()
        if (result) handleSelectWallet(result, result?.address, result?.providerName)
    }

    const handleSelectWallet = (wallet: Wallet, address: string, providerName: string) => {
        if (direction == 'to' && isValidAddress(address, values.to))
            setFieldValue(`destination_address`, address)
        selectBalanceAccount({
            id: wallet.id,
            address,
            providerName,
        })
        setOpenModal(false)
    }

    return <>
        <WalletButton wallets={balanceAccounts} onOpenModalClick={() => setOpenModal(true)} />
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
                    balanceAccounts.map((account, index) => {
                        return (
                            <div key={index}>
                                <div className="flex justify-between items-center px-4 pt-2">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm pl-1 py-1">
                                        {account.provider.name}
                                    </label>
                                </div>
                                <WalletsList
                                    key={index}
                                    onSelect={handleSelectWallet}
                                    selectedAddress={account.address}
                                    account={account}
                                />
                            </div>
                        )
                    })
                }
            </VaulDrawer.Snap>
        </VaulDrawer >
    </>
}

const WalletButton: FC<{ wallets: BalanceAccount[], onOpenModalClick: () => void }> = ({ wallets, onOpenModalClick }) => {
    const firstWallet = useMemo(() => wallets[0], [wallets])
    if (wallets.length > 0) {
        return <button onClick={onOpenModalClick} type="button" className="py-1 px-2 bg-transparent flex items-center w-fit rounded-md space-x-1 relative font-semibold transform hover:bg-secondary-400 transition duration-200 ease-in-out">
            {
                wallets.length === 1 ?
                    <div className="flex gap-2 items-center text-sm text-primary-text">
                        <firstWallet.icon className='h-5 w-5' />
                        {
                            !firstWallet.address &&
                            <p>{shortenAddress(firstWallet.address)}</p>
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


type Props = {
    token?: Token;
    network?: Network;
    account?: BalanceAccount | undefined;
    selectedAddress?: string;
    onSelect: (wallet: Wallet, address: string, providerName: string) => void;
}

const WalletsList: FC<Props> = (props) => {

    const { account, onSelect, selectedAddress } = props
    const provider = account?.provider;
    const connectedWallets = provider?.connectedWallets || []

    const isAccountDuplicate = account && connectedWallets.some(
        (w) => w.address.toLowerCase() === account.address?.toLowerCase()
    )

    const wallets: Wallet[] = [
        ...connectedWallets,
        ...(account && !isAccountDuplicate ? [account as unknown as Wallet] : [])
    ];

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
                            onWalletSelect={(wallet: Wallet, address: string) => provider?.name && onSelect(wallet, address, provider.name)}
                            selectedAddress={selectedAddress}
                        />)
                    }
                </div>
            }
        </div>
    )
}

export default PickerWalletConnect