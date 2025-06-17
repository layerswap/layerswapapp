import { FC, useState } from 'react'
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import { useAccount } from 'wagmi';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient';
import { useEthersSigner } from '@/lib/ethersToViem/ethers';
import toast from 'react-hot-toast';
import AuhorizeEthereum from '@/lib/wallets/paradex/Authorize/Ethereum';
import useWallet from '@/hooks/useWallet';
import WalletIcon from '@/components/icons/WalletIcon';
import { WithdrawPageProps } from '../../Common/sharedTypes';

const ParadexWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, token, callData, swapId }) => {

    const [loading, setLoading] = useState(false)

    const { networks } = useSettingsState();
    const l1Network = networks.find(n => n.name === KnownInternalNames.Networks.EthereumMainnet || n.name === KnownInternalNames.Networks.EthereumSepolia);

    const { setSwapTransaction } = useSwapTransactionStore();

    const { provider } = useWallet(l1Network, 'withdrawal')
    const { chain } = useAccount();

    const wallet = provider?.activeWallet

    const ethersSigner = useEthersSigner()

    const handleTransfer = async () => {
        if (!token || !amount || !callData || !swapId || !ethersSigner) return

        setLoading(true)
        try {
            const account = await AuhorizeEthereum(ethersSigner)

            if (!account) throw new Error('Account not found')

            const res = await account.execute(JSON.parse(callData || ""), undefined, { maxFee: '1000000000000000' });

            if (res.transaction_hash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, res.transaction_hash);
            }
        } catch (e) {
            if (e.message.includes('Contract not found')) {
                toast.error('Account not found', { duration: 30000 })
                return
            }
            toast.error(e.message, { duration: 30000 })
        } finally {
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
        <SendTransactionButton isDisabled={!!(loading || !ethersSigner || !callData)} isSubmitting={!!(loading || !ethersSigner || !callData)} onClick={handleTransfer} icon={<WalletIcon className="h-5 w-5 stroke-2" aria-hidden="true" />} >
            Send from EVM wallet
        </SendTransactionButton>
    )
}
export default ParadexWalletWithdrawStep;