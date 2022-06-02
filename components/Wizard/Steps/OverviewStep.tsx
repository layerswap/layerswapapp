import { CheckIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';
import Link from 'next/link';
import { FC, useCallback, useEffect, useState } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import SubmitButton from '../../buttons/submitButton';

type Props = {
    current: boolean
}

const OverviewStep: FC<Props> = ({ current }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState()
    const { nextStep } = useWizardState();
    const { payment } = useSwapDataState()
    const { processPayment } = useSwapDataUpdate()

    useEffect(() => {
        if (current && payment?.data?.status && payment?.data?.status != "created")
            nextStep()
    }, [payment, current])

    const handleConfirm = useCallback(async () => {
        try {
            setLoading(true)
            await processPayment(payment?.data?.id);
            nextStep()
        }
        catch (e) {
            setError(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [payment, processPayment])

    return (
        <>
            <div className="w-full px-3 md:px-6 md:px-12 py-12 grid grid-flow-row">
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-light-blue">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                <div className="rounded-md border bg-darkblue-600 w-full grid grid-flow-row border-darkblue-100 mb-8">
                    <div className="items-center mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <div className="sm:flex sm:justify-between sm:items-baseline">
                            <span className="text-left">Payment Number: </span>
                            <span>#{payment?.data?.sequence_number}</span>
                        </div>
                        <div className="sm:flex sm:justify-between sm:items-baseline">
                            <span className="text-left">Merchant: </span>
                            <span>Layerswap</span>
                        </div>
                        <div className="sm:flex sm:justify-between sm:items-baseline">
                            <span className="text-left">Payment Method: </span>
                            <span>{payment?.data?.exchange}</span>
                        </div>
                        <div className="sm:flex sm:justify-between sm:items-baseline">
                            <span className="text-left">Amount: </span>
                            <span>{payment?.data?.amount} {payment?.data?.currency}</span>
                        </div>
                        <div className="sm:flex sm:justify-between sm:items-baseline">
                            <span className="text-left">Fee: </span>
                            {/*TODO check flow */}
                            <span>{payment?.data?.manual_flow_context?.withdrawal_fee} {payment?.data?.currency}</span>
                        </div>
                    </div>
                    {/* <div className="items-center inline-flex mx-4 my-3 block text-base font-lighter leading-6 text-light-blue">
                        <p className="inline-flex">Payment Number: <span className="text-right text-white">#52848</span></p>
                    </div> */}
                </div>
                <div>
                    {/* <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                        Coinbase 2FA Code
                    </label> */}
                    {/* <div className="relative rounded-md shadow-sm mt-2 mb-4">
                        <input
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="XXXXXX"
                            autoCorrect="off"
                            type="text"
                            maxLength={6}
                            name="Code"
                            id="Code"
                            className="h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                            placeholder:text-light-blue placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 w-full font-semibold rounded-md placeholder-gray-400"
                            onKeyPress={e => {
                                isNaN(Number(e.key)) && e.preventDefault()
                            }}
                        />
                    </div> */}
                </div>
                <div className="text-white text-sm mt-auto mt-4">
                    <SubmitButton isDisabled={loading} icon="" isSubmitting={loading} onClick={handleConfirm}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>
        </>
    )
}

export default OverviewStep;