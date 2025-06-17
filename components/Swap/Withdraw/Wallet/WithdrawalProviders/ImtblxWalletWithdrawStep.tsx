import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient';
import GuideLink from '@/components/guideLink';
import useWallet from '@/hooks/useWallet';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';
import WarningMessage from '@/components/WarningMessage';

export const ImtblxWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, token }) => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { setSwapTransaction } = useSwapTransactionStore();

    const { provider } = useWallet(network, 'withdrawal')
    const imxAccount = provider?.activeWallet

    const handleTransfer = useCallback(async ({ amount, depositAddress, swapId }: TransferProps) => {
        if (!network || !depositAddress || !amount)
            return
        setLoading(true)
        try {
            const ImtblClient = (await import('@/lib/imtbl')).default;
            const imtblClient = new ImtblClient(network?.name)

            if (!token) {
                throw new Error("No source currency could be found");
            }
            const res = await imtblClient.Transfer(amount.toString(), token, depositAddress)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('Transfer failed or terminated')
            else if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes && swapId) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, transactionRes.txId.toString());
                setTransferDone(true)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [imxAccount, network, token,])

    if (!imxAccount) {
        return <ConnectWalletButton icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} />
    }

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    <WarningMessage messageType='informing'>
                        <span className='flex-none'>
                            Learn how to send from
                        </span>
                        <GuideLink text={network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex/' />
                    </WarningMessage>
                    {
                        imxAccount &&
                        <SendTransactionButton isDisabled={!!(loading || transferDone)} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} />
                    }
                </div>
            </div>
        </>
    )
}