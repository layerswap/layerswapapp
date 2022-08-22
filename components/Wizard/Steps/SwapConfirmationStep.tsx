import { Transition } from '@headlessui/react';
import { ArrowRightIcon, PencilAltIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, Fragment, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { BaseStepProps, FormWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Image from 'next/image'
import toast from 'react-hot-toast';
import { CalculateReceiveAmount } from '../../../lib/fees';
import ToggleButton from '../../buttons/toggleButton';
import { isValidAddress } from '../../../lib/addressValidator';
import AddressDetails from '../../Disclosure/AddressDetails';
import { classNames } from '../../utils/classNames';
import TokenService from '../../../lib/TokenService';
import { BransferApiClient } from '../../../lib/bransferApiClients';
import { CreateSwapParams } from '../../../lib/layerSwapApiClient';

const SwapConfirmationStep: FC<BaseStepProps> = ({ current }) => {
    const { swapFormData, swap } = useSwapDataState()
    if (!swapFormData) {
        return null;
    }

    const [confirm_right_wallet, setConfirm_right_wallet] = useState(false)
    const [towFactorCode, setTwoFactorCode] = useState("")

    const [loading, setLoading] = useState(false)
    const [twoFARequired, setTwoFARequired] = useState(false)
    const { currentStep } = useFormWizardState<FormWizardSteps>()

    const { createSwap, processPayment, updateSwapFormData } = useSwapDataUpdate()
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
        setAddressInputValue(destination_address)
    }, [destination_address])

    const handleTwoFACodeChange = (e) => {
        setTwoFactorCode(e?.target?.value)
    }
    const handleStartEditingAddress = useCallback(() => {
        if (!loading)
            setEditingAddress(true)
    }, [loading])
    const handleAddressInputChange = useCallback((e) => {
        setAddressInputError("")
        setAddressInputValue(e?.target?.value)
        if (!isValidAddress(e?.target?.value, swapFormData.network.baseObject))
            setAddressInputError(`Enter a valid ${swapFormData.network.name} address`)

    }, [network])

    const minimalAuthorizeAmount = Math.round(swapFormData?.currency?.baseObject?.price_in_usdt * Number(swapFormData?.amount?.toString()?.replace(",", ".")) + 5)
    const transferAmount = `${swapFormData?.amount} ${swapFormData?.currency?.name}`
    const handleSubmit = useCallback(async () => {
        setLoading(true)
        setTwoFARequired(false)
        try {
            const data: CreateSwapParams = {
                Amount: Number(swapFormData.amount?.toString()?.replace(",", ".")),
                Exchange: swapFormData.exchange?.id,
                Network: swapFormData.network.id,
                currency: swapFormData.currency.baseObject.asset,
                destination_address: swapFormData.destination_address,
                to_exchange: swapFormData.swapType === "offramp"
            }
            const _swap = swap || await createSwap(data)
            const { payment } = _swap.data
            if (payment?.status === 'created')
                await processPayment(_swap, towFactorCode)
            ///TODO grdon code please refactor
            else if (payment?.status === 'closed') {
                const newSwap = await createSwap(data)
                const newPayment = newSwap
                await processPayment(newSwap, towFactorCode)
                router.push(`/${newSwap.data.id}`)
                return
            }
            router.push(`/${_swap.data.id}`)
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            console.log("error in confirmation", error?.response?.data)
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error?.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                goToStep("ExchangeOAuth")
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require 2FA")) {
                toast("Coinbase 2FA code required")
                setTwoFARequired(true)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "You don't have that much.")) {
                toast.error(`${swapFormData.exchange.name} error: You don't have that much.`)
            }
            else {
                toast.error(errorMessage)
            }
            setLoading(false)
        }
    }, [swapFormData, swap, towFactorCode, minimalAuthorizeAmount, transferAmount])

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
    return (
        <>
            <div className="px-8 h-full flex flex-col justify-between">
                <div className=''>
                    <h3 className='mb-7 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                        Please confirm your swap
                    </h3>
                    <div className="w-full">
                        <div className="rounded-md w-full mb-3">
                            <div className="items-center space-y-1.5 block text-base font-lighter leading-6 text-pink-primary-300">
                                <div className={classNames(swapFormData?.swapType === "offramp" ? 'flex-row-reverse  space-x-reverse' : 'flex-row', 'flex justify-between bg-darkblue-500 rounded-md items-center px-4 py-3')}>
                                    <span className="text-left flex"><span className='hidden md:block'>{swapFormData?.swapType === "onramp" ? "From" : "To"}</span>
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 ml-1 md:ml-5 h-5 w-5 relative">
                                                {swapFormData?.exchange?.imgSrc &&
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
                        <AddressDetails onClick={handleStartEditingAddress} />
                        {
                            twoFARequired &&
                            <div className='mt-4'>
                                <label htmlFor="amount" className="block font-normal text-pink-primary-300 text-sm">
                                    Your Coinbase 2FA code
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
                            placeholder:text-pink-primary-300 placeholder:text-2xl placeholder:h-12 placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-600  w-full font-semibold rounded-md placeholder-gray-400"
                                        onKeyPress={e => {
                                            isNaN(Number(e.key)) && e.preventDefault()
                                        }}
                                        onChange={handleTwoFACodeChange}
                                    />
                                </div>
                            </div>
                        }
                    </div>
                </div>

                <div className="text-white text-sm mt-2">
                    {
                        swapFormData?.swapType === "onramp" &&
                        <div className="mx-auto w-full rounded-lg font-normal">
                            <div className='flex justify-between mb-4 md:mb-8'>
                                <div className='flex items-center text-xs md:text-sm font-medium'>
                                    <ExclamationIcon className='h-6 w-6 mr-2' />
                                    I am the owner of this address
                                </div>
                                <div className='flex items-center space-x-4'>
                                    <ToggleButton onChange={setConfirm_right_wallet} isChecked={confirm_right_wallet} />
                                </div>
                            </div>
                        </div>
                    }
                    {/* <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-pink-primary-300"> First time here? Please read the User Guide </span>
                    </div> */}
                    <SubmitButton isDisabled={(swapFormData?.swapType === "onramp" && !confirm_right_wallet) || loading} icon="" isSubmitting={loading} onClick={handleSubmit}>
                        Confirm
                    </SubmitButton>
                </div>

            </div>
            <Transition
                appear
                show={editingAddress}
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full">
                <div className='absolute inset-0 z-40 -inset-y-11 flex flex-col w-full bg-darkBlue'>
                    <span className='relative z-40 overflow-hidden bg-darkBlue p-4 pt-0'>
                        <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                            <span className="justify-self-end text-pink-primary-300 cursor-pointer">
                                <div className="">
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 hover:text-pink-primary-300"
                                        onClick={handleClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                            </span>
                        </div>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="relative inset-0" ></div>
                        </Transition.Child>

                        <div className="relative inset-0 text-pink-primary-300 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                            <div className="relative min-h-full items-center justify-center p-4 pt-0 text-center">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <div className='pb-12 grid grid-flow-row min-h-[480px] text-pink-primary-300'>
                                        <h4 className='mb-12 md:mb-3.5 mt-4 pt-2 text-xl leading-6 text-center md:text-left font-roboto'>
                                            <PencilAltIcon onClick={handleStartEditingAddress} className='inline-block h-6 w-6 mb-1' /> Editing your <span className='strong-highlight text-lg'>{swapFormData?.network?.name}</span> wallet address
                                        </h4>
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
                                                    className={'disabled:cursor-not-allowed h-12 leading-4 focus:ring-pink-primary focus:border-pink-primary block font-semibold w-full bg-darkblue-600 border-ouline-blue border rounded-md placeholder-gray-400 truncate'}
                                                />
                                                {
                                                    addressInputError &&
                                                    <div className="flex items-center mb-2">
                                                        <span className="block text-base leading-6 text-pink-primary-800"> {addressInputError} </span>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                        <div className="text-white text-sm mt-auto">
                                            <SubmitButton type='button' isDisabled={!!addressInputError} icon="" isSubmitting={loading} onClick={handleSaveAddress}>
                                                Save
                                            </SubmitButton>
                                        </div>
                                    </div>
                                </Transition.Child>
                            </div>
                        </div>
                    </span>
                </div>
            </Transition>
        </>
    )
}

export default SwapConfirmationStep;
