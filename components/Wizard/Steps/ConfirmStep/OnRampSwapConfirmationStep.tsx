import { Transition } from '@headlessui/react';
import { PencilAltIcon, XIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import ToggleButton from '../../../buttons/toggleButton';
import { isValidAddress } from '../../../../lib/addressValidator';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import { CreateSwapParams } from '../../../../lib/layerSwapApiClient';
import NumericInput from '../../../Input/NumericInput';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { nameOf } from '../../../../lib/external/nameof';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';
import { SwapConfirmationFormValues } from '../../../DTOs/SwapConfirmationFormValues';



const OnRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap, codeRequested } = useSwapDataState()
    const formikRef = useRef<FormikProps<SwapConfirmationFormValues>>(null);
    const currentValues = formikRef?.current?.values;
    const initialValues: SwapConfirmationFormValues = { TwoFACode: '', RightWallet: false, TwoFARequired: false }
    const nameOfTwoFARequired = nameOf(currentValues, (r) => r.TwoFARequired);
    const nameOfRightWallet = nameOf(currentValues, (r) => r.RightWallet)
    const { currentStepName } = useFormWizardState<SwapCreateStep>()

    const { updateSwapFormData, createAndProcessSwap, setCodeRequested } = useSwapDataUpdate()
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const [editingAddress, setEditingAddress] = useState(false)
    const [addressInputValue, setAddressInputValue] = useState("")
    const [addressInputError, setAddressInputError] = useState("")

    const { destination_address, network } = swapFormData || {}
    const router = useRouter();

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

        if (codeRequested)
            return goToStep(SwapCreateStep.TwoFactor)

        try {
            const swapId = await createAndProcessSwap();
            router.push(`/${swapId}`)
        }
        catch (error) {
            ///TODO newline may not work, will not defenitaly fix this
            const errorMessage = error.response?.data?.errors?.length > 0 ? error.response.data.errors.map(e => e.message).join(', ') : (error?.response?.data?.error?.message || error?.response?.data?.message || error.message)

            if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require Reauthorization")) {
                setCodeRequested(true)
                goToStep(SwapCreateStep.TwoFactor)
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "Require 2FA")) {
                setCodeRequested(true)
                goToStep(SwapCreateStep.TwoFactor)
                formikRef.current.setFieldValue(nameOfTwoFARequired, true)
            }
            else if (error.response?.data?.errors && error.response?.data?.errors?.length > 0 && error.response?.data?.errors?.some(e => e.message === "You don't have that much.")) {
                toast.error(`${swapFormData.exchange.name} error: You don't have that much.`)
            }
            else {
                toast.error(errorMessage)
            }
        }
    }, [swapFormData, swap, currentValues?.TwoFACode, transferAmount])

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
            <Formik
                initialValues={initialValues}
                onSubmit={handleSubmit}
                innerRef={formikRef}
                validateOnMount={true}
                validate={(values: SwapConfirmationFormValues) => {
                    const errors: FormikErrors<SwapConfirmationFormValues> = {};
                    if (!values.RightWallet) {
                        errors.RightWallet = 'Confirm your wallet';
                    } else if (values.TwoFARequired && (!values.TwoFACode || values.TwoFACode.length < 6)) {
                        errors.TwoFACode = 'TwoFA Required';
                    }
                    return errors;
                }}
            >
                {({ handleChange, isValid, dirty, isSubmitting, values }) => (
                    <div className='px-6 md:px-8 h-full flex flex-col justify-between'>
                        <SwapConfirmMainData>
                            <AddressDetails canEditAddress={!isSubmitting} onClickEditAddress={handleStartEditingAddress} />
                        </SwapConfirmMainData>
                        <Form className="text-white text-sm">
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
                        </Form>
                    </div>
                )}
            </Formik>
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
                            <div className="relative min-h-full items-center justify-center p-2 pt-0 text-center">
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
                                            <SubmitButton type='button' isDisabled={!!addressInputError} icon="" isSubmitting={false} onClick={handleSaveAddress}>
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

export default OnRampSwapConfirmationStep;
