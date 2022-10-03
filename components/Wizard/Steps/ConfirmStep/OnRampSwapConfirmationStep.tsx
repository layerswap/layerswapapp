import { PencilAltIcon } from '@heroicons/react/outline';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import ToggleButton from '../../../buttons/toggleButton';
import { isValidAddress } from '../../../../lib/addressValidator';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { nameOf } from '../../../../lib/external/nameof';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';
import { SwapConfirmationFormValues } from '../../../DTOs/SwapConfirmationFormValues';
import { ApiError, KnownwErrorCode } from '../../../../Models/ApiError';
import Modal from '../../../modalComponent';
import { AnimatePresence } from 'framer-motion';



const OnRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap, codeRequested } = useSwapDataState()
    const { exchange, amount, currency, destination_address, network } = swapFormData || {}
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

    const router = useRouter();

    useEffect(() => {
        formikRef?.current?.resetForm()
    }, [destination_address, exchange])

    useEffect(() => {
        setAddressInputValue(destination_address)
    }, [destination_address])

    const handleStartEditingAddress = () => setEditingAddress(true);

    const handleAddressInputChange = useCallback((e) => {
        setAddressInputError("")
        setAddressInputValue(e?.target?.value)
        if (!isValidAddress(e?.target?.value, network.baseObject))
            setAddressInputError(`Enter a valid ${network.name} address`)

    }, [network])

    const minimalAuthorizeAmount = Math.round(currency?.baseObject?.usd_price * Number(amount) + 5)
    const transferAmount = `${amount} ${currency?.name}`
    const handleSubmit = useCallback(async (values: SwapConfirmationFormValues) => {
        if (codeRequested)
            return goToStep(SwapCreateStep.TwoFactor)

        try {
            const swapId = await createAndProcessSwap();
            router.push(`/${swapId}`)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error

            if (!data) {
                toast.error(error.message)
                return
            }

            if (data.code === KnownwErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                goToStep(SwapCreateStep.OAuth)
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (data.code === KnownwErrorCode.COINBASE_INVALID_2FA) {
                setCodeRequested(true)
                goToStep(SwapCreateStep.TwoFactor)
                formikRef.current.setFieldValue(nameOfTwoFARequired, true)
            }
            else if (data.code === KnownwErrorCode.INSUFFICIENT_FUNDS) {
                toast.error(`${exchange.name} error: You don't have that much.`)
            }
            else {
                toast.error(data.message)
            }
        }
    }, [exchange, swap, currentValues?.TwoFACode, transferAmount])

    const handleClose = () => {
        setEditingAddress(false)
    }

    const handleSaveAddress = useCallback(() => {
        setAddressInputError("")
        if (!isValidAddress(addressInputValue, network.baseObject)) {
            setAddressInputError(`Enter a valid ${network.name} address`)
            return;
        }
        updateSwapFormData({ ...swapFormData, destination_address: addressInputValue })
        setEditingAddress(false)
    }, [addressInputValue, network, swapFormData])

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
                            <SubmitButton type='submit' isDisabled={!isValid || !dirty} isSubmitting={isSubmitting} >
                                Confirm
                            </SubmitButton>
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

export default OnRampSwapConfirmationStep;
