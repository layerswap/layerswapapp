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
import { useSelectedAccount, useSelectSwapAccount } from '@/context/swapAccounts';

export const ParadexWalletWithdraw: FC<WithdrawPageProps> = ({ refuel, swapBasicData, swapId }) => {

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const { activeConnection } = useActiveParadexAccount()

    const selectedEvmAccount = useSelectedAccount("from", l1Network?.name);
    const selectedStarknetAccount = useSelectedAccount("from", starknet?.name);

    const { wallets: evmWallets } = useWallet(l1Network, 'withdrawal')
    const evmWallet = evmWallets.find(w => w.id === selectedEvmAccount?.id)
    const { wallets: starknetWallets } = useWallet(starknet, 'withdrawal')
    const starknetWallet = starknetWallets.find(w => w.id === selectedStarknetAccount?.id)

    if (activeConnection?.providerName === selectedEvmAccount?.providerName && evmWallet) {
        return <Evm refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }
    if (activeConnection?.providerName === selectedStarknetAccount?.providerName && starknetWallet) {
        return <Starknet refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }

    return <ConnectWalletModal />
}
const ConnectWalletModal = () => {
    const { swapBasicData } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()
    const selectSourceAccount = useSelectSwapAccount("from");

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

    return <SubmitButton data-attr="connect-wallet" onClick={handleConnect} type="button" icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />} >
        Connect a wallet
    </SubmitButton>
}