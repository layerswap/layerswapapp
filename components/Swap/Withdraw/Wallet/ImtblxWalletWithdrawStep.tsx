import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import ImtblClient from '../../../../lib/imtbl';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient, { DepositAddress, DepositAddressSource, PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import GuideLink from '../../../guideLink';
import useSWR from 'swr'
import { ApiResponse } from '../../../../Models/ApiResponse';

const ImtblxWalletWithdrawStep: FC = () => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { walletAddress, swap } = useSwapDataState()
    const { setWalletAddress, setSwapPublishedTx } = useSwapDataUpdate()
    const { networks } = useSettingsState()

    const { source_network: source_network_internal_name } = swap
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: generatedDeposit } = useSWR<ApiResponse<DepositAddress>>(`/deposit_addresses/${swap?.source_network}?source=${DepositAddressSource.UserGenerated}`, layerswapApiClient.fetcher)

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            let address: string = walletAddress
            if (!address) {
                const imtblClient = new ImtblClient(source_network?.internal_name)
                const res = await imtblClient.ConnectWallet()
                setWalletAddress(res.address)
                address = res.address
            }
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [source_network])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const imtblClient = new ImtblClient(source_network?.internal_name)
            const source_currency = source_network.currencies.find(c => c.asset.toLocaleUpperCase() === swap.source_network_asset.toLocaleUpperCase())
            const res = await imtblClient.Transfer(swap, source_currency, generatedDeposit?.data?.address)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('Transfer failed or terminated')
            else if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes.status == "success") {
                setSwapPublishedTx(swap.id, PublishedSwapTransactionStatus.Completed, transactionRes.txId.toString());
                setTransferDone(true)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [walletAddress, swap, source_network])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <WarningMessage messageType='informing'>
                        <span className='flex-none'>
                            Learn how to send from
                        </span>
                        <GuideLink text={source_network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex' />
                    </WarningMessage>
                    {
                        !walletAddress &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Connect
                        </SubmitButton>
                    }
                    {
                        walletAddress &&
                        <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default ImtblxWalletWithdrawStep;