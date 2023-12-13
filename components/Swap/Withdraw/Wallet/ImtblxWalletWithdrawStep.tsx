import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useMemo, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import GuideLink from '../../../guideLink';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../store/zustandStore';

type Props = {
    depositAddress?: string
}

const ImtblxWalletWithdrawStep: FC<Props> = ({ depositAddress }) => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { swap } = useSwapDataState()
    const { networks, layers } = useSettingsState()
    const { setSwapTransaction } = useSwapTransactionStore();

    const { source_network: source_network_internal_name } = swap || {}
    const source_network = networks.find(n => n.internal_name === source_network_internal_name)
    const source_layer = layers.find(n => n.internal_name === source_network_internal_name)
    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const imxAccount = provider?.getConnectedWallet()

    const handleConnect = useCallback(async () => {
        if (!provider)
            throw new Error(`No provider from ${source_layer?.internal_name}`)
        if (source_layer?.isExchange === true)
            throw new Error(`Source is exchange`)

        setLoading(true)
        await provider?.connectWallet(source_layer?.chain_id)
        setLoading(false)
    }, [provider, source_layer])

    const handleTransfer = useCallback(async () => {
        if (!source_network || !swap || !depositAddress)
            return
        setLoading(true)
        try {
            const ImtblClient = (await import('../../../../lib/imtbl')).default;
            const imtblClient = new ImtblClient(source_network?.internal_name)
            const source_currency = source_network.currencies.find(c => c.asset.toLocaleUpperCase() === swap.source_network_asset.toLocaleUpperCase())
            if (!source_currency) {
                throw new Error("No source currency could be found");
            }
            const res = await imtblClient.Transfer(swap, source_currency, depositAddress)
            const transactionRes = res?.result?.[0]
            if (!transactionRes)
                toast('Transfer failed or terminated')
            else if (transactionRes.status == "error") {
                toast(transactionRes.message)
            }
            else if (transactionRes.status == "success") {
                setSwapTransaction(swap.id, PublishedSwapTransactionStatus.Completed, transactionRes.txId.toString());
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