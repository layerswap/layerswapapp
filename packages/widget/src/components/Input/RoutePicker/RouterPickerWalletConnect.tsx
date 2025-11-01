import { FC, useMemo, useState } from "react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { SelectAccountProps, Wallet } from "@/types/wallet";
import VaulDrawer from "@/components/Modal/vaulModal";
import { ChevronDown, Plus } from "lucide-react";
import { WalletItem } from "@/components/Wallet/WalletComponents/WalletsList";
import { Network, Token } from "@/Models/Network";
import shortenAddress from "@/components/utils/ShortenAddress";
import WalletIcon from "@/components/Icons/WalletIcon";
import ConnectButton from "@/components/Buttons/connectButton";
import { WalletsIcons } from "@/components/Wallet/WalletComponents/ConnectedWallets";
import { useFormikContext } from "formik";
import { isValidAddress } from "@/lib/address/validator";
import { AccountIdentity, useBalanceAccounts, useUpdateBalanceAccount } from "@/context/balanceAccounts";
import { addressFormat } from "@/lib/address/formatter";
import { SwapDirection, SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";

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
        if (result) handleSelectAccount({
            walletId: result.id,
            address: result.address,
            providerName: result.providerName
        })
    }

    const handleSelectAccount = (props: SelectAccountProps) => {
        const { walletId, address, providerName } = props
        if (direction == 'to' && isValidAddress(address, values.to))
            setFieldValue(`destination_address`, address)
        selectBalanceAccount({
            id: walletId,
            address,
            providerName,
        })
        setOpenModal(false)
    }

    return <>
        <AccountsPickerButton accounts={balanceAccounts} onOpenModalClick={() => setOpenModal(true)} />
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header='Select wallet'
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap id="item-1" className="space-y-1 pb-4">
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
                                <AccountsList
                                    network={direction === 'from' ? values.from : values.to}
                                    key={index}
                                    onSelect={handleSelectAccount}
                                    selectedAccount={account}
                                />
                            </div>
                        )
                    })
                }
            </VaulDrawer.Snap>
        </VaulDrawer >
    </>
}

const AccountsPickerButton: FC<{ accounts: AccountIdentity[], onOpenModalClick: () => void }> = ({ accounts, onOpenModalClick }) => {
    const firstWallet = useMemo(() => accounts[0], [accounts])
    if (accounts.length > 0) {
        return <button onClick={onOpenModalClick} type="button" className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down">
            {
                accounts.length === 1 ?
                    <div className="flex gap-2 items-center text-sm text-secondary-text">
                        <firstWallet.icon className='h-5 w-5' />
                        {
                            firstWallet.address &&
                            <p>{shortenAddress(firstWallet.address)}</p>
                        }
                        <ChevronDown className="h-5 w-5" />
                    </div>
                    :
                    <WalletsIcons wallets={accounts} />
            }
        </button>
    }

    return (
        <ConnectButton>
            <div className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down">
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    )
}


type Props = {
    token?: Token;
    network?: Network;
    selectedAccount?: AccountIdentity | undefined;
    onSelect: (props: SelectAccountProps) => void;
}

const AccountsList: FC<Props> = (props) => {

    const { selectedAccount, onSelect, network } = props
    const provider = selectedAccount?.provider;
    const connectedWallets = provider?.connectedWallets || []
    const networkName = provider?.autofillSupportedNetworks ? { name: provider?.autofillSupportedNetworks[0] } : undefined

    const walletNetwork = network || networkName;

    const isAccountDuplicate = selectedAccount && walletNetwork && connectedWallets.some(
        (w) => w.addresses.some((address) => addressFormat(address, walletNetwork) === addressFormat(selectedAccount.address, walletNetwork))
    )

    const accounts: (Wallet | AccountIdentity)[] = [
        ...connectedWallets,
        ...(selectedAccount && !isAccountDuplicate ? [selectedAccount] : [])
    ];

    return (
        <div className="space-y-3">
            {
                accounts.length > 0 &&
                <div className="flex flex-col justify-start gap-2 rounded-xl">
                    {
                        accounts.map((wallet, index) => <WalletItem
                            key={`${index}${wallet.providerName}`}
                            account={wallet}
                            selectable={true}
                            onWalletSelect={onSelect}
                            selectedAddress={selectedAccount?.address}
                        />)
                    }
                </div>
            }
        </div>
    )
}

export default PickerWalletConnect