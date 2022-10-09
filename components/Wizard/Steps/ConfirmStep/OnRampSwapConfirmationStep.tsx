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
import SwapDetails from '../../../swapDetailsComponent';
import TokenService from '../../../../lib/TokenService';
import LayerSwapApiClient, { SwapItem } from '../../../../lib/layerSwapApiClient';
import { SwapFormValues } from '../../../DTOs/SwapFormValues';



const OnRampSwapConfirmationStep: FC = () => {
    const { swapFormData, swap, codeRequested } = useSwapDataState()
    const { exchange, amount, currency, destination_address, network } = swapFormData || {}
    const formikRef = useRef<FormikProps<SwapConfirmationFormValues>>(null);
    const currentValues = formikRef?.current?.values;
    const initialValues: SwapConfirmationFormValues = { TwoFACode: '', RightWallet: false, TwoFARequired: false }
    const nameOfTwoFARequired = nameOf(currentValues, (r) => r.TwoFARequired);
    const nameOfRightWallet = nameOf(currentValues, (r) => r.RightWallet)
    const { currentStepName } = useFormWizardState<SwapCreateStep>()

    const { updateSwapFormData, createAndProcessSwap, setCodeRequested, cancelSwap } = useSwapDataUpdate()
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const [editingAddress, setEditingAddress] = useState(false)
    const [cancelSwapModalOpen, setCancelSwapModalOpen] = useState(false)
    const [exchangePendingSwap, setExchangePendingSwap] = useState<SwapItem>()

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
            else if (data.code === KnownwErrorCode.INVALID_CREDENTIALS) {
                goToStep(SwapCreateStep.OAuth)
            }
            else if (data.code === KnownwErrorCode.EXISTING_SWAP) {
                const exchangePendingSwap = await getExchangePendingSwap(swapFormData)
                if (!exchangePendingSwap) {
                    toast.error(`Want to cancel pending swap but could not find one.`)
                    return
                }
                setExchangePendingSwap(exchangePendingSwap)
                setCancelSwapModalOpen(true)
            }
            else {
                toast.error(data.message)
            }
        }
    }, [exchange, swap, currentValues?.TwoFACode, transferAmount])

    const handleCancelSwap = useCallback(async () => {
        try {
            await cancelSwap()
            setCancelSwapModalOpen(false)
            setExchangePendingSwap(null)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (!data) {
                toast.error(error.message)
            }
            else {
                toast.error(data.message)
            }
        }
    }, [])

    const getExchangePendingSwap = async (swapFormData: SwapFormValues) => {
        const authData = TokenService.getAuthData();
        if (!authData?.access_token)
            throw new Error("Not authenticated")
        const { access_token } = authData
        const { exchange } = swapFormData

        const layerswapApiClient = new LayerSwapApiClient(router)

        const pendingSwaps = await layerswapApiClient.getPendingSwaps(access_token)
        return pendingSwaps.data.find(s => exchange.baseObject.currencies.some(ec => ec.id === s.exchange_currency_id))
    }

    const handleClose = () => {
        setEditingAddress(false)
    }
    const handleCloseCancelSwapModal = () => {
        setCancelSwapModalOpen(false)
    }
    const handleSaveAddress = useCallback(() => {
        setAddressInputError("")
        if (!isValidAddress(addressInputValue, network.baseObject)) {
            setAddressInputError(`Enter a valid ${network.name} address`)
            return;
        }
        updateSwapFormData({ ...swapFormData, destination_address: addressInputValue })
        // formikRef.current.setFieldValue("destination_address", addressInputValue)
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
                            <SubmitButton type='submit' isDisabled={!isValid} isSubmitting={isSubmitting} >
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
            <Modal
                isOpen={cancelSwapModalOpen}
                onDismiss={handleCloseCancelSwapModal}
                title={
                    <h4 className='text-lg text-white'>
                        You already have pending swap for {exchange.name} </h4>
                }
            >
                <div className='grid grid-flow-row px-6 md:px-8 text-primary-text'>
                    <div className='mb-4'>
                        <SwapDetails id={exchangePendingSwap?.id} />
                    </div>

                    <div className="mt-auto flex space-x-4">
                        <SubmitButton type='button' size='small' isDisabled={!!addressInputError} isSubmitting={false} onClick={handleCancelSwap}>
                            Terminate pending swap
                        </SubmitButton>
                        <SubmitButton type='button' size='small' buttonStyle='outline' isDisabled={false} isSubmitting={false} onClick={handleCloseCancelSwapModal}>
                            Do another swap
                        </SubmitButton>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default OnRampSwapConfirmationStep;
