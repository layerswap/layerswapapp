import { FC } from 'react'
import useWallet from '@/hooks/useWallet';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import Evm from './Evm';
import Starknet from './Starknet';
import { useSwapDataState } from '@/context/swap';
import SubmitButton from '@/components/buttons/submitButton';
import { WalletIcon } from 'lucide-react';
import { WithdrawPageProps } from '../../Common/sharedTypes';
import { useConnectModal } from '@/components/WalletModal';
import { useActiveParadexAccount } from '@/components/WalletProviders/ActiveParadexAccount';
import { useSelectedAccount, useUpdateBalanceAccount } from '@/context/balanceAccounts';

export const ParadexWalletWithdraw: FC<WithdrawPageProps> = ({ refuel, swapBasicData, swapId }) => {

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const { activeConnection } = useActiveParadexAccount()
    const { provider: evmProvider } = useWallet(l1Network, 'withdrawal')
    const { provider: starknetProvider } = useWallet(starknet, 'withdrawal')

    const selectedEvmAccount = useSelectedAccount("from", evmProvider?.name);
    const selectedStarknetAccount = useSelectedAccount("from", starknetProvider?.name);

    const evmWallet = selectedEvmAccount?.wallet
    const starknetWallet = selectedStarknetAccount?.wallet

    if (activeConnection?.providerName === evmProvider?.name && evmWallet) {
        return <Evm refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }
    if (activeConnection?.providerName === starknetProvider?.name && starknetWallet) {
        return <Starknet refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }

    return <ConnectWalletModal />
}
const ConnectWalletModal = () => {
    const { swapBasicData } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()
    const selectSourceAccount = useUpdateBalanceAccount("from");

    const handleConnect = async () => {
        const result = await connect(provider)
        if (result) {
            selectSourceAccount({
                id: result.id,
                address: result.address,
                providerName: result.providerName
            })
        }
    }

    return <SubmitButton onClick={handleConnect} type="button" icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />} >
        Connect a wallet
    </SubmitButton>
}