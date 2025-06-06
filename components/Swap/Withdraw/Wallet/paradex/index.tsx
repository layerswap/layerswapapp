import { FC } from 'react'
import useWallet from '../../../../../hooks/useWallet';
import { WithdrawPageProps } from '../WalletTransferContent';
import { useSettingsState } from '../../../../../context/settings';
import KnownInternalNames from '../../../../../lib/knownIds';
import Evm from './Evm';
import Starknet from './Starknet';
import { useWalletStore } from '../../../../../stores/walletStore';
import { useSwapDataState, useSwapDataUpdate } from '../../../../../context/swap';
import { Wallet } from '../../../../../Models/WalletProvider';
import SubmitButton from '../../../../buttons/submitButton';
import { WalletIcon } from 'lucide-react';
import { useConnectModal } from '../../../../WalletModal';

const ParadexWalletWithdraw: FC<WithdrawPageProps> = ({ amount, token, callData, swapId }) => {

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const selectedProvider = useWalletStore((state) => state.selectedProveder)
    const { provider: evmProvider } = useWallet(l1Network, 'withdrawal')
    const { provider: starknetProvider } = useWallet(starknet, 'withdrawal')

    const evmWallet = evmProvider?.activeWallet
    const starknetWallet = starknetProvider?.activeWallet

    if (selectedProvider === evmProvider?.name && evmWallet) {
        return <Evm amount={amount} callData={callData} token={token} swapId={swapId} />
    }
    if (selectedProvider === starknetProvider?.name && starknetWallet) {
        return <Starknet amount={amount} callData={callData} token={token} swapId={swapId} />
    }

    return <ConnectWalletModal />
}
const ConnectWalletModal = () => {
    const { swapResponse } = useSwapDataState()
    const { source_network } = swapResponse?.swap || {}
    const { provider } = useWallet(source_network, 'withdrawal')
    const { connect } = useConnectModal()
    const { setSelectedSourceAccount } = useSwapDataUpdate()

    const handleSelectWallet = (wallet?: Wallet | undefined, address?: string | undefined) => {
        if (wallet && address) {
            setSelectedSourceAccount({
                wallet,
                address
            })
        }
        else {
            setSelectedSourceAccount(undefined)
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

export default ParadexWalletWithdraw;