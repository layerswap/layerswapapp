import { FC } from 'react'
import useWallet from '@/hooks/useWallet';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import Evm from './Evm';
import Starknet from './Starknet';
import { useWalletStore } from '@/stores/walletStore';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { Wallet, WalletProvider } from '@/Models/WalletProvider';
import SubmitButton from '@/components/buttons/submitButton';
import { WalletIcon } from 'lucide-react';
import { WithdrawPageProps } from '../../Common/sharedTypes';
import { useConnectModal } from '@/components/WalletModal';

export const ParadexWalletWithdraw: FC<WithdrawPageProps> = ({ refuel, swapBasicData, swapId }) => {

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const selectedProvider = useWalletStore((state) => state.selectedProveder)
    const { provider: evmProvider } = useWallet(l1Network, 'withdrawal')
    const { provider: starknetProvider } = useWallet(starknet, 'withdrawal')

    const evmWallet = evmProvider?.activeWallet
    const starknetWallet = starknetProvider?.activeWallet

    if (selectedProvider === evmProvider?.name && evmWallet) {
        return <Evm refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }
    if (selectedProvider === starknetProvider?.name && starknetWallet) {
        return <Starknet refuel={refuel} swapBasicData={swapBasicData} swapId={swapId} />
    }

    return <ConnectWalletModal />
}
const ConnectWalletModal = () => {
    const { swapBasicData } = useSwapDataState()
    const { source_network } = swapBasicData || {}
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()

    const handleSelectWallet = (wallet: Wallet, address: string) => {
        if (wallet && address && provider) {
            provider?.switchAccount && provider?.switchAccount(wallet, address)
        }
    }
    const handleConnect = async () => {
        const result = await connect(provider)
        if (result) {
            handleSelectWallet(result, result.address)
        }
    }

    return <SubmitButton onClick={handleConnect} type="button" icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />} >
        Connect a wallet
    </SubmitButton>
}