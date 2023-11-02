import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import GuideLink from '../../../guideLink';
import useWallet from '../../../../hooks/useWallet';
import { NetworkType } from '../../../../Models/CryptoNetwork';
import { Layer } from '../../../../Models/Layer';
import { NetworkCurrency } from '../../../../Models/CryptoNetwork';

type Props = {
    depositAddress?: string
}

const ImtblxWalletWithdrawStep: FC<Props> = ({ depositAddress }) => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { connectWallet, wallets } = useWallet()
    const { swap } = useSwapDataState()
    const { setSwapPublishedTx } = useSwapDataUpdate()
    const { networks, layers } = useSettingsState()

    const { source_network: source_network_internal_name } = swap || {}
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const source_layer = layers.find(n => n.internal_name === source_network_internal_name)
    const imxAccount = wallets?.find(w => w.network.type === source_layer?.type)

    const handleConnect = useCallback(async () => {
        if (!source_network)
            return
        setLoading(true)
        await connectWallet(source_layer as Layer & { type: NetworkType.StarkEx })
        setLoading(false)
    }, [source_network])

    const handleTransfer = useCallback(async () => {
        if (!source_network || !swap || !depositAddress)
            return
        setLoading(true)
        try {
            const ImtblClient = (await import('../../../../lib/imtbl')).default;
            const imtblClient = new ImtblClient(source_network?.internal_name)
            const source_currency = source_network.currencies.find(c => c.asset.toLocaleUpperCase() === swap.source_network_asset.toLocaleUpperCase()) as NetworkCurrency
            const res = await imtblClient.Transfer(swap, source_currency, depositAddress)
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
    }, [imxAccount, swap, source_network, depositAddress])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    <WarningMessage messageType='informing'>
                        <span className='flex-none'>
                            Learn how to send from
                        </span>
                        <GuideLink text={source_network?.display_name} userGuideUrl='https://docs.layerswap.io/user-docs/your-first-swap/off-ramp/send-assets-from-immutablex' />
                    </WarningMessage>
                    {
                        !imxAccount &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Connect
                        </SubmitButton>
                    }
                    {
                        imxAccount &&  
                        <SubmitButton isDisabled={!!(loading || transferDone) || !depositAddress} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
}


export default ImtblxWalletWithdrawStep;