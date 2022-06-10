import { CheckIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';
import Router, { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import { BaseStepProps, FormWizardSteps, SwapWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';

const SwapConfirmationStep: FC<BaseStepProps> = ({ current }) => {
    const [confirm_right_wallet, setConfirm_right_wallet] = useState(false)
    const [confirm_right_information, setConfirm_right_information] = useState(false)
    const [towFactorCode, setTwoFactorCode] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [twoFARequired, setTwoFARequired] = useState(false)

    const { swapFormData, swap } = useSwapDataState()
    const { createSwap, processPayment, getSwapAndPayment, getPayment } = useSwapDataUpdate()
    const { goToStep, setWizardError } = useFormWizardaUpdate<FormWizardSteps>()
    const router = useRouter();

    useEffect(() => {
        setError("")
    }, [current])

    const handleConfirm_right_wallet = (e) => {
        setConfirm_right_wallet(e.target.checked)
    }
    const handleConfirm_right_information = (e) => {
        setConfirm_right_information(e.target.checked)
    }
    const handleTwoFACodeChange = (e) => {
        setTwoFactorCode(e?.target?.value)
    }
    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const transferAmount = `${swapFormData?.amount} ${swapFormData?.currency?.name}`
    const handleSubmit = useCallback(async () => {
        setLoading(true)
        setError("")
        setTwoFARequired(false)
        try {
            const data = {
                Amount: Number(swapFormData.amount),
                Exchange: swapFormData.exchange?.id,
                Network: swapFormData.network.id,
                currency: swapFormData.currency.baseObject.asset,
                destination_address: swapFormData.destination_address
            }
            const _swap = swap || await createSwap(data)
            const payment = await getPayment(_swap.external_payment_id)
            if (payment?.data?.status === 'created')
                await processPayment(payment?.data?.id, towFactorCode)
            ///TODO grdon code please refactor
            else if (payment?.data?.status === 'closed') {
                const newSwap = await createSwap(data)
                const newPayment = await getPayment(newSwap.external_payment_id)
                await processPayment(newPayment?.data?.id, towFactorCode)
                router.push(`/${newSwap.id}`);
                return;
            }
            router.push(`/${_swap.id}`);
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            console.log("error in confirmation", error?.response?.data)
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                await goToStep("ExchangeOAuth")
                setWizardError(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require 2FA")) {
                setError("Two factor authentication is required")
                setTwoFARequired(true)
            }
            else if(error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "You don't have that much.")) {
                setError(`${swapFormData.exchange.name} error: You don't have that much.`)
            }
            else {
                setError(errorMessage)
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapFormData, swap, towFactorCode, minimalAuthorizeAmount, transferAmount])

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
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    You are requesting a transfer of {swapFormData?.amount} {swapFormData?.currency?.name} from your {swapFormData?.exchange?.name} exchange account to your {swapFormData?.network?.name} wallet ({`${swapFormData?.destination_address?.substr(0, 5)}...${swapFormData?.destination_address?.substr(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`})
                </p>
                <p className='mb-12 md:mb-3.5 text-white mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                    To continue, you have to confirm that
                </p>
                <div>
                    <div className="flex items-center md:mb-3 mb-5">
                        <input
                            onChange={handleConfirm_right_wallet}
                            id="confirm_right_wallet_"
                            name="confirm_right_wallet_"
                            type="checkbox"
                            className="cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_wallet_' className="cursor-pointer  ml-3 block text-lg leading-6 text-light-blue"> The provided address is your <span className='text-white'>{swapFormData?.network?.name}</span> wallet address </label>
                    </div>
                    <div className="flex items-center mb-12 md:mb-11">
                        <input
                            onChange={handleConfirm_right_information}
                            id="confirm_right_information"
                            name="confirm_right_information"
                            type="checkbox"
                            className="cursor-pointer h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor='confirm_right_information' className="cursor-pointer ml-3 block text-lg leading-6 text-light-blue"> Providing wrong information will result in a loss of funds </label>
                    </div>
                    {
                        twoFARequired &&
                        <div>
                            <label htmlFor="amount" className="block font-normal text-light-blue text-sm">
                                Your verification code
                            </label>
                            <div className="relative rounded-md shadow-sm mt-2 mb-4">
                                <input
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder="XXXXXXX"
                                    autoCorrect="off"
                                    type="text"
                                    maxLength={7}
                                    name="TwoFACode"
                                    id="TwoFACode"
                                    className="h-12 text-2xl pl-5 focus:ring-pink-primary text-center focus:border-pink-primary border-darkblue-100 block
                            placeholder:text-light-blue placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600 border-gray-600 w-full font-semibold rounded-md placeholder-gray-400"
                                    onKeyPress={e => {
                                        isNaN(Number(e.key)) && e.preventDefault()
                                    }}
                                    onChange={handleTwoFACodeChange}
                                />
                            </div>
                        </div>
                    }

                </div>
                <div className="text-white text-sm mt-auto">
                    <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-light-blue"> First time here? Please read the User Guide </span>
                    </div>
                    <SubmitButton isDisabled={!confirm_right_wallet || !confirm_right_information || loading} icon="" isSubmitting={loading} onClick={handleSubmit}>
                        Confirm
                    </SubmitButton>
                </div>
            </div>

        </>
    )
}

export default SwapConfirmationStep;