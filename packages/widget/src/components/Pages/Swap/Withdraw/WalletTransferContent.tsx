import { FC } from 'react'
import WalletIcon from '@/components/Icons/WalletIcon';
import useWallet from '@/hooks/useWallet';
import AddressWithIcon from '@/components/Input/Address/AddressPicker/AddressWithIcon';
import { AddressGroup } from '@/components/Input/Address/AddressPicker';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import VaulDrawer from '@/components/Modal/vaulModal';
import { SelectAccountProps } from '@/Models/WalletProvider';
import { useSettingsState } from '@/context/settings';
import WalletsList from '@/components/Wallet/WalletComponents/WalletsList';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { useSelectedAccount, useUpdateBalanceAccount } from '@/context/balanceAccounts';
import { useBalance } from '@/lib/balances/useBalance';

type Props = {
    swapData: SwapBasicData
    openModal: boolean;
    setOpenModal: (show: boolean) => void
}
const WalletTransferContent: FC<Props> = ({ openModal, setOpenModal, swapData }) => {
    const { networks } = useSettingsState()

    const { source_token, source_network: swap_source_network } = swapData
    const source_network = swap_source_network && networks.find(n => n.name === swap_source_network?.name)
    const { provider } = useWallet(source_network, 'withdrawal')
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    const availableWallets = provider?.connectedWallets?.filter(c => !c.isNotAvailable) || []
    const selectSourceAccount = useUpdateBalanceAccount("from");

    const changeWallet = async (props: SelectAccountProps) => {
        selectSourceAccount({
            id: props.walletId,
            address: props.address,
            providerName: props.providerName
        })
        setOpenModal(false)
    }

    const { balances } = useBalance(selectedSourceAccount?.address, source_network)
    const { wallets } = useWallet(source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)

    const walletBalance = source_network && balances?.find(b => b?.network === source_network?.name && b?.token === source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, source_token?.precision)

    let accountAddress: string | undefined = ""
    if (selectedSourceAccount) {
        accountAddress = selectedSourceAccount.address || "";
    }

    if (!accountAddress) {
        return <>
            <div className='flex justify-center'>
                <WalletIcon className='w-12 text-secondary-800/70' />
            </div>
        </>
    }

    return <>
        <div className="grid content-end">
            {
                selectedSourceAccount &&
                source_network &&
                <div className="group/addressItem flex rounded-lg justify-between space-x-3 items-center shadow-xs mt-1.5 text-primary-text bg-secondary-500 disabled:cursor-not-allowed h-12 leading-4 font-medium w-full py-7">
                    <AddressWithIcon
                        addressItem={{ address: accountAddress, group: AddressGroup.ConnectedWallet, wallet: wallet }}
                        network={source_network}
                        onDisconnect={() => wallet?.disconnect && wallet?.disconnect()}
                    />
                    <div className="flex flex-col col-start-8 col-span-3 items-end font-normal text-secondary-text text-xs">
                        <p>Balance</p>
                        <p className='flex items-center gap-1'><span>{truncateDecimals(Number(walletBalanceAmount), walletBalance?.decimals)}</span> <span>{walletBalance?.token}</span></p>
                    </div>
                </div>
            }
        </div>
        {
            source_network &&
            source_token &&
            provider &&
            availableWallets &&
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id='item-1'>
                    <WalletsList
                        network={source_network}
                        token={source_token}
                        onSelect={changeWallet}
                        selectable
                        wallets={availableWallets}
                        provider={provider}
                    />
                </VaulDrawer.Snap>
            </VaulDrawer>
        }
    </>
}

export default WalletTransferContent