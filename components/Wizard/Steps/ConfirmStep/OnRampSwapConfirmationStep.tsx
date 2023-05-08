import { Edit, AlertOctagon, Check } from 'lucide-react';
import { useRouter } from 'next/router';
import { FC, useCallback, useRef, useState } from 'react'
import { useFormWizardaUpdate } from '../../../../context/formWizardProvider';
import { useSwapDataState, useSwapDataUpdate } from '../../../../context/swap';
import { SwapCreateStep } from '../../../../Models/Wizard';
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import ToggleButton from '../../../buttons/toggleButton';
import { isValidAddress } from '../../../../lib/addressValidator';
import AddressDetails from '../../../DisclosureComponents/AddressDetails';
import { FormikProps } from 'formik';
import { nameOf } from '../../../../lib/external/nameof';
import SwapConfirmMainData from '../../../Common/SwapConfirmMainData';
import { SwapConfirmationFormValues } from '../../../DTOs/SwapConfirmationFormValues';
import { ApiError, KnownwErrorCode } from '../../../../Models/ApiError';
import { useTimerState } from '../../../../context/timerContext';
import Widget from '../../Widget';
import WarningMessage from '../../../WarningMessage';
import KnownInternalNames from '../../../../lib/knownIds';
import LayerSwapApiClient from '../../../../lib/layerSwapApiClient';
import Modal from '../../../modal/modal';
import { Layer } from '../../../../Models/Layer';

const TIMER_SECONDS = 120

const OnRampSwapConfirmationStep: FC = () => {
    const [loading, setLoading] = useState(false)
    const { swapFormData, swap, codeRequested, addressConfirmed, withdrawManually } = useSwapDataState()
    const { from, destination_address, to } = swapFormData || {}
    const formikRef = useRef<FormikProps<SwapConfirmationFormValues>>(null);
    const currentValues = formikRef?.current?.values;

    const nameOfRightWallet = nameOf(currentValues, (r) => r.RightWallet)

    const { updateSwapFormData, createAndProcessSwap, setAddressConfirmed, setCodeRequested } = useSwapDataUpdate()
    const { goToStep, setError } = useFormWizardaUpdate<SwapCreateStep>()
    const [editingAddress, setEditingAddress] = useState(false)
    const [addressInputValue, setAddressInputValue] = useState(destination_address)
    const [addressInputError, setAddressInputError] = useState("")
    const [withdrawalType, setWithdrawalType] = useState(false)

    const { start: startTimer } = useTimerState()
    const router = useRouter();

    const handleStartEditingAddress = () => setEditingAddress(true);

    const handleAddressInputChange = useCallback((e) => {
        setAddressInputError("")
        setAddressInputValue(e?.target?.value)
        if (!isValidAddress(e?.target?.value, to))
            setAddressInputError(`Enter a valid ${to?.display_name} address`)
    }, [to])

    const handleSubmit = useCallback(async (e: any) => {
        setLoading(true)
        let nextStep: SwapCreateStep;
        if (swap && codeRequested)
            return goToStep(SwapCreateStep.TwoFactor)
        try {
            if (!swap) {
                const swapId = await createAndProcessSwap();
                if (from?.internal_name?.toLowerCase() === KnownInternalNames.Exchanges.Coinbase.toLowerCase()) {
                    if (!withdrawManually) {
                        const layerswapApiClient = new LayerSwapApiClient()
                        await layerswapApiClient.WithdrawFromExchange(swapId, from?.internal_name)
                    }
                }
                return await router.push(`/swap/${swapId}`)
            }
            else {
                const swapId = swap.id
                if (!withdrawManually) {
                    const layerswapApiClient = new LayerSwapApiClient()
                    await layerswapApiClient.WithdrawFromExchange(swapId, from?.internal_name)
                }
                return await router.push(`/swap/${swapId}`)
            }
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error
            if (!data) {
                toast.error(error.message)
                return
            }
            else if (data.code === KnownwErrorCode.COINBASE_INVALID_2FA) {
                startTimer(TIMER_SECONDS)
                setCodeRequested(true)
                nextStep = SwapCreateStep.TwoFactor
            }
            else if (data.code === KnownwErrorCode.INSUFFICIENT_FUNDS) {
                setError({ Code: data.code, Step: SwapCreateStep.Confirm })
                goToStep(SwapCreateStep.Error)
                setError({ Code: data.code, Step: SwapCreateStep.Confirm })
            }
            else if (data.code === KnownwErrorCode.INVALID_CREDENTIALS || data.code === KnownwErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                nextStep = SwapCreateStep.AuthorizeCoinbaseWithdrawal
            }
            else if (data.code === KnownwErrorCode.ACTIVE_SWAP_LIMIT_EXCEEDED) {
                goToStep(SwapCreateStep.ActiveSwapLimit)
            }
            else {
                toast.error(data.message)
            }
        }
        setLoading(false)
        if (nextStep)
            goToStep(nextStep)
    }, [from, swap, createAndProcessSwap, withdrawalType])

    const handleClose = () => {
        setEditingAddress(false)
    }
    const handleSaveAddress = useCallback(() => {
        setAddressInputError("")
        if (!isValidAddress(addressInputValue, to)) {
            setAddressInputError(`Enter a valid ${to.display_name} address`)
            return;
        }
        updateSwapFormData({ ...swapFormData, destination_address: addressInputValue })
        setEditingAddress(false)
    }, [addressInputValue, to, swapFormData])
    const handleConfirmToggleChange = (value: boolean) => {
        setAddressConfirmed(value)
    }

    const currentNetwork = swapFormData?.to;
    const currentExchange = swapFormData?.from as Layer & { isExchange: true };
    const currentCurrency = swapFormData?.currency;

    return (<>
        <Widget>
            <Widget.Content>
                <SwapConfirmMainData>
                    <AddressDetails canEditAddress={!loading} onClickEditAddress={handleStartEditingAddress} />
                </SwapConfirmMainData>
                {
                    currentExchange?.assets.filter(ec => ec.asset === currentCurrency.asset)?.some(ce => ce.network_internal_name === currentNetwork?.internal_name) &&
                    <WarningMessage messageType='informing'>
                        <span>You might be able transfer {currentCurrency.asset} from {currentExchange.display_name} to {currentNetwork.display_name} directly</span>
                    </WarningMessage>
                }
            </Widget.Content>
            <Widget.Footer>
                <div className="text-white text-sm">
                    <div className="mx-auto w-full rounded-lg font-normal">
                        <div className='flex justify-between mb-4 md:mb-8'>
                            <div className='flex items-center text-sm font-medium'>
                                <Check className='h-6 w-6 mr-2' />
                                I am the owner of this address
                            </div>
                            <div className='flex items-center space-x-4'>
                                <ToggleButton name={nameOfRightWallet} onChange={handleConfirmToggleChange} value={addressConfirmed} />
                            </div>
                        </div>
                    </div>
                    <SubmitButton className='plausible-event-name=Swap+details+confirmed' type='submit' isDisabled={!addressConfirmed} isSubmitting={loading} onClick={handleSubmit}>
                        Confirm
                    </SubmitButton>
                </div>
            </Widget.Footer>
            <Modal
                show={editingAddress}
                setShow={setEditingAddress}
                header={<h4 className='text-lg text-white'>
                    <Edit onClick={handleStartEditingAddress} className='inline-block h-6 w-6 mr-1' />
                    Editing your {swapFormData?.to?.display_name} wallet address</h4>}>
                <div className='grid grid-flow-row text-primary-text'>
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
                                className={'disabled:cursor-not-allowed h-12 leading-4 focus:ring-0 focus:border-primary block font-semibold w-full bg-darkblue-700 border-darkblue-500 border rounded-md truncate'}
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
        </Widget>
    </>

    )
}

export default OnRampSwapConfirmationStep;
