import { ArrowLeftRight, WalletIcon } from 'lucide-react';
import { FC, useCallback, useMemo, useState } from 'react'
import useWallet from '../../../../../hooks/useWallet';
import { WithdrawPageProps } from '../WalletTransferContent';
import * as Paradex from "@paradex/sdk";
import { TypedData } from '@paradex/sdk/dist/ethereum-signer';
import { useAccount } from 'wagmi';
import { useSettingsState } from '../../../../../context/settings';
import KnownInternalNames from '../../../../../lib/knownIds';
import { useSwapTransactionStore } from '../../../../../stores/swapTransactionStore';
import { BackendTransactionStatus } from '../../../../../lib/layerSwapApiClient';
import { useEthersSigner } from '../../../../../lib/ethersToViem/ethers';
import toast from 'react-hot-toast';
import Evm from './Evm';
import Starknet from './Starknet';
import { ButtonWrapper, ConnectWalletButton } from './buttons';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../../shadcn/dialog';
import { ResolveConnectorIcon } from '../../../../icons/ConnectorIcons';
import { useWalletStore } from '../../../../../stores/walletStore';

const ParadexWalletWithdraw: FC<WithdrawPageProps> = ({ amount, token, callData, swapId }) => {

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const selectedProvider = useWalletStore((state) => state.selectedProveder)

    const { getWithdrawalProvider } = useWallet()

    const evmProvider = useMemo(() => {
        return l1Network && getWithdrawalProvider(l1Network)
    }, [l1Network, getWithdrawalProvider])

    const starknetProvider = useMemo(() => {
        return starknet && getWithdrawalProvider(starknet)
    }, [l1Network, getWithdrawalProvider])

    const evmWallet = evmProvider?.getConnectedWallet()
    const starknetWallet = starknetProvider?.getConnectedWallet()

    if (selectedProvider === evmProvider?.name && evmWallet) {
        return <Evm amount={amount} callData={callData} token={token} swapId={swapId} />
    }
    if (selectedProvider === starknetProvider?.name && starknetWallet) {
        return <Starknet amount={amount} callData={callData} token={token} swapId={swapId} />
    }

    return <ConnectWalletModal />
}
const ConnectWalletModal = () => {
    const [openDialog, setOpenDialog] = useState<boolean>(false)

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);
    const select = useWalletStore((state) => state.selectProvider)

    return <>
        <ButtonWrapper
            icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            onClick={() => setOpenDialog(true)}
        >
            Send from wallet
        </ButtonWrapper>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-center">Connect wllet</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col justify-start space-y-2">
                    <ConnectWalletButton
                        isButton={true}
                        onClick={() => setOpenDialog(false)}
                        onConnect={()=>select("evm")}
                        network={l1Network}
                        text='EVM'
                        icon={<ResolveConnectorIcon
                            connector="evm"
                            iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                        />}
                    />
                    <ConnectWalletButton
                        isButton={true}
                        onClick={() => setOpenDialog(false)}
                        onConnect={()=>select("starknet")}
                        network={starknet}
                        text='Starknet'
                        icon={<ResolveConnectorIcon
                            connector="starknet"
                            iconClassName="w-7 h-7 p-0.5 rounded-full bg-secondary-800 border border-secondary-400"
                        />}
                    />
                </div>
                <DialogFooter>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
}

export default ParadexWalletWithdraw;