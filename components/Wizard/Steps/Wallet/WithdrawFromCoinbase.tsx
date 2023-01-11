import { CheckIcon, LinkIcon, SwitchHorizontalIcon } from '@heroicons/react/solid';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { SwapWithdrawalStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import toast from 'react-hot-toast';
import LayerSwapApiClient, { UserExchangesData } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import { classNames } from '../../../utils/classNames';
import { GetSwapStatusStep } from '../../../utils/SwapStatus';
import shortenAddress from "../../../utils/ShortenAddress"
import { GetSourceDestinationData } from '../../../../helpers/swapHelper';
import { SwapStatus } from '../../../../Models/SwapStatus';
import { parseJwt } from '../../../../lib/jwtParser';
import TokenService from '../../../../lib/TokenService';
import useSWR from 'swr';
import { ApiResponse } from '../../../../Models/ApiResponse';
import { OpenLink } from '../../../../lib/openLink';


const WithdrawFromCoinbase: FC = () => {
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { swap } = useSwapDataState()
    const { networks, exchanges, currencies, discovery: { resource_storage_url } } = useSettingsState()
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()

    const { network, exchange } = GetSourceDestinationData({ swap, currencies, exchanges, networks, resource_storage_url })

    const layerswapApiClient = new LayerSwapApiClient()
    const exchange_account_endpoint = `/exchange_accounts/${swap.source_exchange}?type=1`
    const { data: exchange_account } = useSWR<ApiResponse<UserExchangesData>>(swap?.source_exchange ? exchange_account_endpoint : null, layerswapApiClient.fetcher)

    const swapStatusStep = GetSwapStatusStep(swap)

    useEffect(() => {
        if (swapStatusStep && swap.status != SwapStatus.UserTransferPending)
            goToStep(swapStatusStep)
    }, [swapStatusStep, swap])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {
            const layerswapApiClient = new LayerSwapApiClient()
            await layerswapApiClient.WithdrawFromExchange(swap.id, swap.source_exchange)
            setTransferDone(true)
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [swap, network])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    <div className="flex items-center">
                        <h3 className="block text-lg font-medium text-white leading-6 text-left">
                            Complete the transfer
                        </h3>
                    </div>
                    <p className='leading-5'>
                        We’ll help you to send crypto from your Coinbase account
                    </p>
                </div>
                {
                    exchange_account &&
                    <SubmitButton isDisabled={loading || transferDone} isSubmitting={loading || transferDone} onClick={handleTransfer} icon={<SwitchHorizontalIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Transfer
                    </SubmitButton>
                }
            </div>
        </>
    )
}

function WalletSteps({ steps }) {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={classNames(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
                        {step.status === 'complete' ? (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-primary" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start">
                                    <span className="flex h-9 items-center">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full  bg-primary">
                                            <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-gray-300">{step.name}</span>
                                        {/* <span className="text-sm text-primary-text">{step.description}</span> */}
                                    </span>
                                </div>
                            </>
                        ) : step.status === 'current' ? (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start" aria-current="step">
                                    <span className="flex h-9 items-center" aria-hidden="true">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-primary">{step.name}</span>
                                        <span className="text-sm text-primary-text">{step.description}</span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                {stepIdx !== steps.length - 1 ? (
                                    <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                ) : null}
                                <div className="group relative flex items-start">
                                    <span className="flex h-9 items-center" aria-hidden="true">
                                        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                                            <span className="h-2.5 w-2.5 rounded-full bg-transparent " />
                                        </span>
                                    </span>
                                    <span className="ml-4 flex min-w-0 flex-col">
                                        <span className="text-sm font-medium text-primary-text">{step.name}</span>
                                        <span className="text-sm text-primary-text">{step.description}</span>
                                    </span>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    )
}

export default WithdrawFromCoinbase;