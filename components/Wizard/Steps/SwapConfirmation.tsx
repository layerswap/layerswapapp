import { Dialog, Transition } from '@headlessui/react';
import { CheckIcon, PencilAltIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/solid';
import Router, { useRouter } from 'next/router';
import { FC, Fragment, useCallback, useEffect, useState } from 'react'
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useWizardState } from '../../../context/wizard';
import { isValidAddress } from '../../../lib/etherAddressValidator';
import { BaseStepProps, FormWizardSteps, SwapWizardSteps } from '../../../Models/Wizard';
import SubmitButton from '../../buttons/submitButton';
import Image from 'next/image'
import toast from 'react-hot-toast';

const SwapConfirmationStep: FC<BaseStepProps> = ({ current }) => {
    const [confirm_right_wallet, setConfirm_right_wallet] = useState(false)
    const [confirm_right_information, setConfirm_right_information] = useState(false)
    const [towFactorCode, setTwoFactorCode] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [twoFARequired, setTwoFARequired] = useState(false)

    const { swapFormData, swap } = useSwapDataState()
    const { createSwap, processPayment, updateSwapFormData } = useSwapDataUpdate()
    const { goToStep, setWizardError } = useFormWizardaUpdate<FormWizardSteps>()
    const [editingAddress, setEditingAddress] = useState(false)
    const [addressInputValue, setAddressInputValue] = useState("")
    const [addressInputError, setAddressInputError] = useState("")

    const { destination_address, network } = swapFormData || {}
    const router = useRouter();

    useEffect(() => {
        setAddressInputValue(destination_address)
    }, [destination_address])

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
            const { payment } = _swap
            if (payment?.status === 'created')
                await processPayment(_swap, towFactorCode)
            ///TODO grdon code please refactor
            else if (payment?.status === 'closed') {
                const newSwap = await createSwap(data)
                const newPayment = newSwap
                await processPayment(newSwap, towFactorCode)
                router.push(`/${newSwap.id}`)
                return
            }
            router.push(`/${_swap.id}`)
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            console.log("error in confirmation", error?.response?.data)
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error?.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                await goToStep("ExchangeOAuth")
                setWizardError(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require 2FA")) {
                toast.error("Two factor authentication is required")
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

    return (
        <>
            <div className="w-full px-8 py-6 pt-1 md:grid md:grid-flow-row min-h-[480px] text-pink-primary-300 font-light">
                <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                    Please confirm your swap
                </h3>
                <h3 className='mb-10 pt-2 text-center md:text-left font-roboto text-sm'>
                    You are requesting a transfer of <span className='strong-highlight font-semibold'>{swapFormData?.amount} {swapFormData?.currency?.name}</span> from your {swapFormData?.exchange?.name} exchange account to your {swapFormData?.network?.name} wallet (<span className='strong-highlight font-semibold'>{`${swapFormData?.destination_address?.substring(0, 5)}...${swapFormData?.destination_address?.substring(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`}<PencilAltIcon onClick={handleStartEditingAddress} className='inline-block h-5 w-5 ml-2 mb-2 cursor-pointer hover:text-pink-primary-800' /></span>)
                </h3>

                <div className="mx-auto w-full rounded-lg bg-darkblue-500 p-2 font-normal">
                    {
                        swapFormData?.exchange?.imgSrc &&
                        <div className="mx-1 flex">
                            <div className="flex-shrink-0 h-12 w-12 relative rounded-full border-4 border-darkblue-500">
                                <Image
                                    src={swapFormData?.exchange?.imgSrc}
                                    alt="Exchange Logo"
                                    height="40"
                                    width="40"
                                    loading="eager"
                                    priority
                                    layout="responsive"
                                    className="rounded-full object-contain"
                                />
                            </div>
                            <div className="flex-shrink-0 h-12 w-12 relative -left-3 rounded-full border-4 border-darkblue-500">
                                <Image
                                    src={swapFormData?.network?.imgSrc}
                                    alt="Exchange Logo"
                                    height="40"
                                    width="40"
                                    loading="eager"
                                    priority
                                    layout="responsive"
                                    className="object-contain rounded-full overflow-hidden "
                                />
                            </div>
                            <div className='text-w'>
                                <div>
                                    <span className='hidden md:inline-block'>{swapFormData?.destination_address}</span>
                                    <span className='md:hidden'> {`${swapFormData?.destination_address?.substring(0, 5)}...${swapFormData?.destination_address?.substring(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`}</span>
                                    <PencilAltIcon onClick={handleStartEditingAddress} className='inline-block h-5 w-5 ml-2 mb-2 cursor-pointer hover:text-pink-primary-800' /></div>
                                <div>{swapFormData?.amount} {swapFormData?.currency?.name}</div>
                            </div>
                        </div>
                    }

                </div>

                <p className='mt-4 pt-2 text-lg leading-6 md:text-center md:text-left font-roboto text-white'>
                    To continue, you have to confirm that
                </p>

                <div className='mb-8'>
                    <div className="flex items-center">
                        <input
                            onChange={handleConfirm_right_wallet}
                            id="confirm_right_wallet_"
                            name="confirm_right_wallet_"
                            type="checkbox"
                            className="cursor-pointer h-4 w-4 focus:ring-pink-primary text-pink-primary  rounded" />
                        <label htmlFor='confirm_right_wallet_' className="cursor-pointer  ml-3 block text-base leading-6"> The provided address is your <span className='strong-highlight text-lg'>{swapFormData?.network?.name}</span> wallet address </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            onChange={handleConfirm_right_information}
                            id="confirm_right_information"
                            name="confirm_right_information"
                            type="checkbox"
                            className="cursor-pointer h-4 w-4 focus:ring-pink-primary text-pink-primary  rounded" />
                        <label htmlFor='confirm_right_information' className="cursor-pointer ml-3 block text-md leading-6 "> Providing wrong information will result in a loss of funds </label>
                    </div>
                    {
                        twoFARequired &&
                        <div>
                            <label htmlFor="amount" className="block font-normal text-sm">
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
                {
                    error &&
                    <div className="bg-[#3d1341] border-l-4 border-[#f7008e] p-4 mb-5 flex items-center mb-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ExclamationIcon className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-xl text-pink-primary-300 font-normal">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                }
                <div className="text-white text-sm mt-auto">
                    <div className="flex items-center mb-2">
                        <span className="block text-sm leading-6 text-pink-primary-300"> First time here? Please read the User Guide </span>
                    </div>
                    <SubmitButton isDisabled={!confirm_right_wallet || !confirm_right_information || loading} icon="" isSubmitting={loading} onClick={handleSubmit}>
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
                    <span className='relative z-40 overflow-hidden bg-darkBlue p-10 pt-0'>
                        <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                            <span className="justify-self-end text-pink-primary-300 cursor-pointer">
                                <div className="">
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 focus:ring-2 hover:text-pink-primary-300"
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