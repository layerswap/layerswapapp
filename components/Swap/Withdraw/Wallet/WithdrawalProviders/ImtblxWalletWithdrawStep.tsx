import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import GuideLink from '@/components/guideLink';
import useWallet from '@/hooks/useWallet';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';
import WarningMessage from '@/components/WarningMessage';
import { useSelectedAccount } from '@/context/balanceAccounts';

export const ImtblxWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { source_network, source_token } = swapBasicData;

    const { provider } = useWallet(source_network, 'withdrawal')
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);
    const imxAccount = selectedSourceAccount?.wallet

    const handleTransfer = useCallback(async ({ amount, depositAddress, swapId }: TransferProps) => {
        if (!source_network || !depositAddress || !amount)
            return
        setLoading(true)
        try {
            const ImtblClient = (await import('@/lib/imtbl')).default;
            const imtblClient = new ImtblClient(source_network?.name)

            if (!source_token) {
                throw new Error("No source currency could be found");
            }
            const res = await imtblClient.Transfer(amount.toString(), source_token, depositAddress)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('Transfer failed or terminated')
            else if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes && swapId) {
                setTransferDone(true)
                return transactionRes.txId.toString()
            }
        }
        catch (e) {
            setLoading(false)
            if (e?.message)
                toast(e.message)
            throw e
        }
    }, [imxAccount, source_network, source_token])

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
                        <GuideLink text={source_network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex/' />
                    </WarningMessage>
                    {
                        imxAccount &&
                        <SendTransactionButton
                            isDisabled={!!(loading || transferDone)}
                            isSubmitting={!!(loading || transferDone)}
                            onClick={handleTransfer}
                            icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />}
                            swapData={swapBasicData}
                            refuel={refuel}
                        />
                    }
                </div>
            </div>
        </>
    )
}