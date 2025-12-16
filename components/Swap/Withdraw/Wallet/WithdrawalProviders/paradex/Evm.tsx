import { FC, useState } from 'react'
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import { useAccount } from 'wagmi';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import { useEthersSigner } from '@/lib/ethersToViem/ethers';
import toast from 'react-hot-toast';
import AuhorizeEthereum from '@/lib/wallets/paradex/Authorize/Ethereum';
import WalletIcon from '@/components/icons/WalletIcon';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import { useSelectedAccount } from '@/context/swapAccounts';
import useWallet from '@/hooks/useWallet';

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
            const client = await AuhorizeEthereum(ethersSigner)
            const account = (client as any).account;

            if (!account) throw new Error('Account not found')

            const res = await account.execute(JSON.parse(callData || ""));

            if (res.transaction_hash) {
                return res.transaction_hash
            }
        } catch (e) {
            setLoading(false)
            if (e.message.includes('Contract not found')) {
                toast.error('Account not found', { duration: 30000 })
                throw e
            }
            toast.error(e.message, { duration: 30000 })
            throw e
        }
        finally {
            setLoading(false)
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