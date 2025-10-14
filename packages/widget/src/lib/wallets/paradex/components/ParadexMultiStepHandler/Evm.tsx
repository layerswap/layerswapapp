import { FC, useState } from 'react'
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from '@/components/Pages/Swap/Withdraw/Wallet/Common/buttons';
import { useAccount } from 'wagmi';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import { useEthersSigner } from '@/lib/ethersToViem/ethers';
import AuhorizeEthereum from '@/lib/wallets/paradex/Authorize/Ethereum';
import WalletIcon from '@/components/Icons/WalletIcon';
import { WithdrawPageProps } from '@/components/Pages/Swap/Withdraw/Wallet/Common/sharedTypes';
import { TransferProps } from '@/types';
import { useSelectedAccount } from '@/context/balanceAccounts';
import useWallet from '@/hooks/useWallet';
import { TransactionMessageType } from '@/components/Pages/Swap/Withdraw/messages/TransactionMessages';

const ParadexWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {

    const [loading, setLoading] = useState(false)

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);
    const { source_token } = swapBasicData;

    const { chain } = useAccount();

    const selectedSourceAccount = useSelectedAccount("from", l1Network?.name);
    const { wallets } = useWallet(l1Network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)

    const ethersSigner = useEthersSigner()

    const handleTransfer = async ({ amount, callData, swapId }: TransferProps) => {
        if (!source_token || !amount || !callData || !swapId || !ethersSigner) return

        setLoading(true)
        try {
            const account = await AuhorizeEthereum(ethersSigner)

            if (!account) throw new Error('Account not found')

            const res = await account.execute(JSON.parse(callData || ""), { maxFee: '1000000000000000' });

            if (res.transaction_hash) {
                return res.transaction_hash
            }
        } catch (error) {
            setLoading(false)
            error.name = TransactionMessageType.UexpectedErrorMessage
            error.message = error
            throw new Error(error)
        }
    }

    if (!wallet) {
        return <ConnectWalletButton />
    }

    if (l1Network && chain?.id !== Number(l1Network.chain_id)) {
        return (
            <ChangeNetworkButton
                chainId={Number(l1Network?.chain_id)}
                network={l1Network}
            />
        )
    }

    return (
        <SendTransactionButton
            isDisabled={!!(loading || !ethersSigner)}
            isSubmitting={!!(loading || !ethersSigner)}
            onClick={handleTransfer}
            icon={<WalletIcon className="h-5 w-5 stroke-2" aria-hidden="true" />}
            swapData={swapBasicData}
            refuel={refuel}
        >
            Send from EVM wallet
        </SendTransactionButton>
    )
}
export default ParadexWalletWithdrawStep;