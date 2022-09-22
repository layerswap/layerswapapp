import { ArrowRightIcon, PencilAltIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { BaseStepProps, FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Image from 'next/image'
import toast from 'react-hot-toast';
import { CalculateReceiveAmount } from '../../../lib/fees';
import ToggleButton from '../../buttons/toggleButton';
import { isValidAddress } from '../../../lib/addressValidator';
import AddressDetails from '../../DisclosureComponents/AddressDetails';
import { classNames } from '../../utils/classNames';
import TokenService from '../../../lib/TokenService';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import { CreateSwapParams } from '../../../lib/layerSwapApiClient';
import NumericInput from '../../Input/NumericInput';
import NetworkSettings from '../../../lib/NetworkSettings';
import WarningMessage from '../../WarningMessage';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { nameOf } from '../../../lib/external/nameof';
import Modal from '../../modalComponent';

interface SwapConfirmationFormValues {
    TwoFACode: string;
    RightWallet: boolean;
    TwoFARequired: boolean;
}

const SwapConfirmationStep: FC<BaseStepProps> = ({ current }) => {
    const { swapFormData, swap } = useSwapDataState()
    const formikRef = useRef<FormikProps<SwapConfirmationFormValues>>(null);
    const currentValues = formikRef?.current?.values;
    const initialValues: SwapConfirmationFormValues = { TwoFACode: '', RightWallet: false, TwoFARequired: false }
    const nameOfTwoFACode = nameOf(currentValues, (t) => t.TwoFACode);
    const nameOfTwoFARequired = nameOf(currentValues, (r) => r.TwoFARequired);
    const nameOfRightWallet = nameOf(currentValues, (r) => r.RightWallet)
    const { currentStep } = useFormWizardState<FormWizardSteps>()

    const { createSwap, processPayment, updateSwapFormData, getSwap } = useSwapDataUpdate()
    const { goToStep } = useFormWizardaUpdate<FormWizardSteps>()
    const [editingAddress, setEditingAddress] = useState(false)
    const [addressInputValue, setAddressInputValue] = useState("")
    const [addressInputError, setAddressInputError] = useState("")

    const { destination_address, network } = swapFormData || {}
    const router = useRouter();

    useEffect(() => {
        (async () => {
            if (currentStep === "SwapConfirmation" && swapFormData?.swapType === "offramp") {
                const authData = TokenService.getAuthData();
                if (!authData) {
                    goToStep("Email")
                    return;
                }
                const bransferApiClient = new BransferApiClient()
                const response = await bransferApiClient.GetExchangeDepositAddress(swapFormData?.exchange?.baseObject?.internal_name, swapFormData.currency?.baseObject?.asset?.toUpperCase(), authData.access_token)
                updateSwapFormData((old) => ({ ...old, destination_address: response.data }))
            }
        })()
    }, [currentStep])

    useEffect(() => {
        formikRef?.current?.resetForm()
    }, [destination_address, swapFormData?.exchange])

    useEffect(() => {
        setAddressInputValue(destination_address)
    }, [destination_address])

    const handleStartEditingAddress = () => setEditingAddress(true);

    const handleAddressInputChange = useCallback((e) => {
        setAddressInputError("")
        setAddressInputValue(e?.target?.value)
        if (!isValidAddress(e?.target?.value, swapFormData.network.baseObject))
            setAddressInputError(`Enter a valid ${swapFormData.network.name} address`)

    }, [network])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount) + 5)
    const transferAmount = `${swapFormData?.amount} ${swapFormData?.currency?.name}`
    const handleSubmit = useCallback(async (values: SwapConfirmationFormValues) => {
        handleReset();
        handleStart();
        try {
            const data: CreateSwapParams = {
                Amount: Number(swapFormData.amount),
                Exchange: swapFormData.exchange?.id,
                Network: swapFormData.network.id,
                currency: swapFormData.currency.baseObject.asset,
                destination_address: swapFormData.destination_address,
                to_exchange: swapFormData.swapType === "offramp"
            }
            const _swap = swap?.data?.id ? await getSwap(swap.data.id) : await createSwap(data)
            const { payment } = _swap.data
            if (payment?.status === 'created')
                await processPayment(_swap, values.TwoFACode)
            ///TODO grdon code please refactor
            else if (payment?.status === 'closed') {
                const newSwap = await createSwap(data)
                const newPayment = newSwap
                await processPayment(newSwap, values.TwoFACode)
                router.push(`/${newSwap.data.id}`)
                return
            }
            router.push(`/${_swap.data.id}`)
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error?.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                goToStep("ExchangeOAuth")
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require 2FA")) {
                toast("Coinbase 2FA code required");
                formikRef.current.setFieldValue(nameOfTwoFARequired, true);

            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "You don't have that much.")) {
                toast.error(`${swapFormData.exchange.name} error: You don't have that much.`)
            }
            else {
                toast.error(errorMessage)
            }
        }
    }, [swapFormData, swap, currentValues?.TwoFACode, transferAmount])

    const handleResendTwoFACode = () => {
        handleReset()
        handleStart()
        formikRef.current.setFieldValue(nameOfTwoFACode, "");
        handleSubmit(currentValues);
    }

    const handleClose = () => {
        setEditingAddress(false)
    }

    const handleSaveAddress = useCallback(() => {
        setAddressInputError("")
        if (!isValidAddress(addressInputValue, swapFormData.network.baseObject)) {
            setAddressInputError(`Enter a valid ${swapFormData.network.name} address`)
            return;
        }
        updateSwapFormData({ ...swapFormData, destination_address: addressInputValue })
        setEditingAddress(false)
    }, [addressInputValue, swapFormData])

    const receive_amount = CalculateReceiveAmount(Number(swapFormData?.amount), swapFormData?.currency?.baseObject, swapFormData?.exchange?.baseObject, swapFormData?.swapType)

    const twoDigits = (num) => String(num).padStart(2, '0')
    const STATUS = {
        STARTED: 'Started',
        STOPPED: 'Stopped',
    }
    const INITIAL_COUNT = 120
    const [secondsRemaining, setSecondsRemaining] = useState(INITIAL_COUNT)
    const [status, setStatus] = useState(STATUS.STOPPED)

    const secondsToDisplay = secondsRemaining % 60
    const minutesRemaining = (secondsRemaining - secondsToDisplay) / 60
    const minutesToDisplay = minutesRemaining % 60


    const handleStart = () => {
        setStatus(STATUS.STARTED)
    }
    const handleReset = () => {
        setStatus(STATUS.STOPPED)
        setSecondsRemaining(INITIAL_COUNT)
    }

    function useInterval(callback, delay) {
        const savedCallback = useRef(undefined)

        useEffect(() => {
            savedCallback.current = callback
        }, [callback])

        useEffect(() => {
            function tick() {
                savedCallback.current()
            }
            if (delay !== null) {
                let id = setInterval(tick, delay)
                return () => clearInterval(id)
            }
        }, [delay])
    }

    useInterval(
        () => {
            if (secondsRemaining > 0) {
                setSecondsRemaining(secondsRemaining - 1)
            } else {
                setStatus(STATUS.STOPPED)
            }
        },
        status === STATUS.STARTED ? 1000 : null)

    return (
        <>
            <Formik
                initialValues={initialValues}
                onSubmit={handleSubmit}
                innerRef={formikRef}
                validateOnMount={true}
                validate={(values: SwapConfirmationFormValues) => {
                    const errors: FormikErrors<SwapConfirmationFormValues> = {};
                    if (swapFormData?.swapType === "onramp" && !values.RightWallet) {
                        errors.RightWallet = 'Confirm your wallet';
                    } else if (values.TwoFARequired && (!values.TwoFACode || values.TwoFACode.length < 6)) {
                        errors.TwoFACode = 'TwoFA Required';
                    }
                    return errors;
                }}
            >
                {({ handleChange, isValid, dirty, isSubmitting, values }) => (
                    <div className='px-6 md:px-8 h-full flex flex-col justify-between'>
                        <div>
                            <h3 className='mb-7 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                                Please confirm your swap
                            </h3>
                            <div className="w-full">
                                <div className="rounded-md w-full mb-3">
                                    <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-primary-text">
                                        <div className={classNames(swapFormData?.swapType === "offramp" ? 'flex-row-reverse  space-x-reverse' : 'flex-row', 'flex justify-between bg-darkblue-500 rounded-md items-center px-4 py-3')}>
                                            <span className="text-left flex"><span className='hidden md:block'>{swapFormData?.swapType === "onramp" ? "From" : "To"}</span>
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                                        {
                                                            swapFormData?.exchange?.imgSrc &&
                                                            <Image
                                                                src={swapFormData?.exchange?.imgSrc}
                                                                alt="Exchange Logo"
                                                                height="60"
                                                                width="60"
                                                                layout="responsive"
                                                                className="rounded-md object-contain"
                                                            />
                                                        }
                                                    </div>
                                                    <div className="mx-1 text-white">{swapFormData?.exchange?.name.toUpperCase()}</div>
                                                </div>
                                            </span>
                                            <ArrowRightIcon className='h-5 w-5 block md:hidden' />
                                            <span className="flex"><span className='hidden md:block'>{swapFormData?.swapType === "onramp" ? "To" : "From"}</span>
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                                        {
                                                            swapFormData?.network?.imgSrc &&
                                                            <Image
                                                                src={swapFormData?.network?.imgSrc}
                                                                alt="Network Logo"
                                                                height="60"
                                                                width="60"
                                                                layout="responsive"
                                                                className="rounded-md object-contain"
                                                            />
                                                        }
                                                    </div>
                                                    <div className="ml-1 text-white">{swapFormData?.network?.name.toUpperCase()}</div>
                                                </div>
                                            </span>
                                        </div>

                                        <div className="flex justify-between px-4 py-3 items-baseline">
                                            <span className="text-left">Amount</span>
                                            <span className="text-white">{swapFormData?.amount} {swapFormData?.currency?.name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between bg-darkblue-500 rounded-md px-4 py-3 items-baseline">
                                            <span className="text-left">Fee</span>
                                            <span className="text-white">{(Number(swapFormData?.amount) - receive_amount).toFixed(swapFormData?.currency?.baseObject.precision)} {swapFormData?.currency?.name}</span>
                                        </div>
                                        <div className="flex justify-between px-4 py-3  items-baseline">
                                            <span className="text-left">You will receive</span>
                                            <span className="text-white">{receive_amount} {swapFormData?.currency?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                {
                                    swapFormData?.swapType === "offramp" && NetworkSettings.KnownSettings[network?.baseObject?.id]?.ConfirmationWarningMessage &&
                                    <WarningMessage className='mb-4'>
                                        <p className='font-normal text-darkblue-600'>
                                            {NetworkSettings.KnownSettings[network?.baseObject?.id]?.ConfirmationWarningMessage}
                                        </p>
                                    </WarningMessage>
                                }
                                <AddressDetails canEditAddress={!isSubmitting} onClickEditAddress={handleStartEditingAddress} />
                            </div>
                        </div>
                        <Form className="text-white text-sm">
                            {
                                values.TwoFARequired &&
                                <div className='my-4'>
                                    <label htmlFor={nameOfTwoFACode} className="block font-normal text-primary-text text-sm">
                                        Your Coinbase 2FA code
                                    </label>
                                    <NumericInput
                                        pattern='^[0-9]*$'
                                        placeholder="XXXXXXX"
                                        maxLength={7}
                                        name={nameOfTwoFACode}
                                        onChange={e => {
                                            /^[0-9]*$/.test(e.target.value) && handleChange(e)
                                        }}
                                        className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-primary text-center focus:border-primary border-darkblue-100 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                    />

                                    <span className="flex text-sm leading-6 items-center mt-1.5">
                                        {
                                            status == STATUS.STARTED ?
                                                <span>
                                                    Send again in
                                                    <span className='ml-1'>
                                                        {twoDigits(minutesToDisplay)}:
                                                        {twoDigits(secondsToDisplay)}
                                                    </span>
                                                </span>
                                                :
                                                <span onClick={handleResendTwoFACode} className="decoration underline-offset-1 underline hover:no-underline decoration-primary hover:cursor-pointer">
                                                    Resend code
                                                </span>
                                        }
                                    </span>
                                </div>
                            }
                            {
                                swapFormData?.swapType === "onramp" ?
                                    <>
                                        <div className="mx-auto w-full rounded-lg font-normal">
                                            <div className='flex justify-between mb-4 md:mb-8'>
                                                <div className='flex items-center text-xs md:text-sm font-medium'>
                                                    <ExclamationIcon className='h-6 w-6 mr-2' />
                                                    I am the owner of this address
                                                </div>
                                                <div className='flex items-center space-x-4'>
                                                    <ToggleButton name={nameOfRightWallet} />
                                                </div>
                                            </div>
                                        </div>
                                        <SubmitButton type='submit' isDisabled={!isValid || !dirty} icon="" isSubmitting={isSubmitting} >
                                            Confirm
                                        </SubmitButton>
                                    </>
                                    :
                                    <SubmitButton type='submit' isDisabled={false} icon="" isSubmitting={isSubmitting} >
                                        Confirm
                                    </SubmitButton>
                            }
                        </Form>
                    </div>
                )}
            </Formik>
            <Modal
                isOpen={editingAddress}
                onDismiss={handleClose}
                title={
                    <h4 className='text-lg text-white'>
                        <PencilAltIcon onClick={handleStartEditingAddress} className='inline-block h-6 w-6 mr-1' />
                        Editing your {swapFormData?.network?.name} wallet address</h4>
                }
                description={""}
            >
                <div className='grid grid-flow-row px-6 md:px-8 text-primary-text'>
                    <div>
                        <label htmlFor="address" className="block font-normal text-sm text-left">
                            Address
                        </label>
                        <div className="relative rounded-md shadow-sm mt-2 mb-4">
                            <input
                                placeholder={"0x123...ab56c"}
                                autoCorrect="off"
                                onChange={handleAddressInputChange}
                                value={addressInputValue}
                                type={"text"}
                                name="destination_address"
                                id="destination_address"
                                className={'disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-600 border-darkblue-100 border rounded-md truncate'}
                            />
                            {
                                addressInputError &&
                                <div className="flex items-center mb-2">
                                    <span className="block text-base leading-6 text-primary"> {addressInputError} </span>
                                </div>
                            }
                        </div>
                    </div>
                    <div className="mt-auto flex space-x-4">
                        <SubmitButton type='button' size='small' isDisabled={!!addressInputError} isSubmitting={false} onClick={handleSaveAddress}>
                            Save
                        </SubmitButton>
                        <SubmitButton type='button' size='small' buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={handleClose}>
                            Cancel
                        </SubmitButton>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default SwapConfirmationStep;
