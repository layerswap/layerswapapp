import { Info, ScanFace } from 'lucide-react';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useSwapDataState } from '../../../../context/swap';
import { useTimerState } from '../../../../context/timerContext';
import LayerSwapApiClient from '../../../../lib/apiClients/layerSwapApiClient';
import { ApiError, LSAPIKnownErrorCode } from '../../../../Models/ApiError';
import SubmitButton from '../../../buttons/submitButton';
import SpinIcon from '../../../icons/spinIcon';
import NumericInput from '../../../Input/NumericInput';
import MessageComponent from '../../../MessageComponent';
import Modal from '../../../modal/modal';
import TimerWithContext from '../../../TimerComponent';
import { Widget } from '../../../Widget/Index';

const TIMER_SECONDS = 120

interface CodeFormValues {
    Code: string
}

type Props = {
    onSuccess: (swapId: string) => Promise<void>
    footerStickiness?: boolean
}

//TODO email code is almost identical create reusable component for email and two factor code verification
const Coinbase2FA: FC<Props> = ({ onSuccess, footerStickiness = true }) => {
    const initialValues: CodeFormValues = { Code: '' }
    const { swapBasicData, swapDetails } = useSwapDataState()
    const [loading, setLoading] = useState(false)
    const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false)
    const [showFundsOnHoldModal, setShowFundsOnHoldModal] = useState(false)

    const { start: startTimer } = useTimerState()

    const formikRef = useRef<FormikProps<CodeFormValues>>(null);

    const handleSubmit = useCallback(async (values: CodeFormValues) => {
        if (!swapDetails || !swapBasicData?.source_exchange)
            return
        setLoading(true)
        try {
            const layerswapApiClient = new LayerSwapApiClient()
            await layerswapApiClient.WithdrawFromExchange(swapDetails.id, swapBasicData.source_exchange.name, values.Code)
            await onSuccess(swapDetails.id)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error

            if (!data) {
                toast.error(error.message)
                return
            }
            else if (data.code === LSAPIKnownErrorCode.INSUFFICIENT_FUNDS) {
                setShowInsufficientFundsModal(true)
            }
            else if (data.code === LSAPIKnownErrorCode.FUNDS_ON_HOLD) {
                setShowFundsOnHoldModal(true)
            }
            else {
                toast.error(data.message)
            }
        }
        setLoading(false)
    }, [swapBasicData, swapDetails])

    const handleResendTwoFACode = useCallback(async () => {
        if (!swapDetails || !swapBasicData?.source_exchange)
            return
        setLoading(true)
        try {
            formikRef.current?.setFieldValue("Code", "");
            const layerswapApiClient = new LayerSwapApiClient()
            await layerswapApiClient.WithdrawFromExchange(swapDetails.id, swapBasicData.source_exchange.name)
        } catch (error) {
            const data: ApiError = error?.response?.data?.error

            if (!data) {
                toast.error(error.message)
                return
            }
            if (data.code === LSAPIKnownErrorCode.COINBASE_INVALID_2FA) {
                startTimer(TIMER_SECONDS)
                return
            }
            else {
                toast.error(data.message)
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapBasicData, swapDetails])
    return <>
        <Modal show={showInsufficientFundsModal} setShow={setShowInsufficientFundsModal} modalId='insufficientFunds'>
            <MessageComponent>
                <MessageComponent.Content center icon='red'>
                    <MessageComponent.Header>
                        Transfer failed
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        This transfer can&apos;t be processed because you don&apos;t have enough available funds on Coinbase.
                    </MessageComponent.Description>
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                        window.open("https://www.coinbase.com/", "_blank")
                    }}>
                        Check Coinbase
                    </SubmitButton>
                </MessageComponent.Buttons>
            </MessageComponent>
        </Modal>
        <Modal show={showFundsOnHoldModal} setShow={setShowFundsOnHoldModal} modalId='funds'>
            <MessageComponent>
                <MessageComponent.Content center icon='red'>
                    <MessageComponent.Header>
                        Transfer failed
                    </MessageComponent.Header>
                    <MessageComponent.Description>
                        This transfer can&apos;t be processed because your funds might be on hold on Coinbase. This usually happens when you want to cash out immediately after completeing a purchare or adding cash.
                    </MessageComponent.Description>
                </MessageComponent.Content>
                <MessageComponent.Buttons>
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => {
                        window.open("https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/available-balance-faq", "_blank")
                    }}>
                        Learn More
                    </SubmitButton>
                </MessageComponent.Buttons>
            </MessageComponent>
        </Modal>
        <Formik
            initialValues={initialValues}
            validateOnMount={true}
            innerRef={formikRef}
            validate={(values: CodeFormValues) => {
                const errors: FormikErrors<CodeFormValues> = {};
                if (!/^[0-9]*$/.test(values.Code)) {
                    errors.Code = "Value should be numeric";
                }
                else if (values.Code.length != 7 && values.Code.length != 6) {
                    errors.Code = `The length should be 6 or 7 instead of ${values.Code.length}`;
                }
                return errors;
            }}
            onSubmit={handleSubmit}
        >
            {({ isValid, isSubmitting, errors, handleChange }) => (
                <Form className='flex flex-col jutsify-center text-secondary-text h-full '>
                    <Widget.Content center>
                        <div className="w-full flex-col justify-between flex h-full">
                            <ScanFace className='w-12 h-12 md:w-16 md:h-16 mt-auto text-primary self-center' />
                            <div className='text-center md:mt-5 md:mb-8'>
                                <p className='mb-2 md:mb-6 mt-2 pt-2 text-2xl font-bold text-primary-text leading-6 text-center font-roboto'>
                                    Coinbase 2FA
                                </p>
                                <p className='text-center text-base px-2'>
                                    Please enter the 2 step verification code of your Coinbase account.
                                </p>
                            </div>
                            <div className="relative rounded-md shadow-xs mt-2 md:mt-5">
                                <NumericInput
                                    pattern='^[0-9]*$'
                                    placeholder="XXXXXXX"
                                    maxLength={7}
                                    name='Code'
                                    onChange={e => {
                                        /^[0-9]*$/.test(e.target.value) && handleChange(e)
                                    }}
                                    className="leading-none h-12 text-2xl pl-5 text-primary-text  focus:ring-primary text-center focus:border-primary border-secondary-500 block
                                placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-secondary-700  w-full font-semibold rounded-md placeholder-primary-text"
                                />
                            </div>
                            <span className="flex text-sm leading-6 items-center mt-1.5">
                                <TimerWithContext seconds={120}
                                    waitingComponent={(remainingTime) => (
                                        <span>
                                            <span>Resend in</span>
                                            <span className='ml-1'>
                                                {remainingTime}
                                            </span>
                                        </span>
                                    )}>
                                    {!loading ? <span onClick={handleResendTwoFACode} className="decoration underline-offset-1 underline hover:no-underline decoration-primary hover:cursor-pointer">
                                        Resend code
                                    </span>
                                        : <SpinIcon className="animate-spin h-5 w-5" />}
                                </TimerWithContext>
                            </span>
                            <div className='p-4 bg-secondary-700 text-secondary-text rounded-lg border border-secondary-500 my-4'>
                                <div className="flex items-center">
                                    <Info className='h-5 w-5 text-primary-600 mr-3' />
                                    <label className="block text-sm md:text-base font-medium leading-6">To obtain the 2 step verification code, check:</label>
                                </div>
                                <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-left">
                                    <li>your authenticator app (Google, Microsoft, or other), or</li>
                                    <li>text messages of the phone number associated with your Coinbase account</li>
                                </ul>
                            </div>
                        </div>
                    </Widget.Content>
                    <Widget.Footer sticky={footerStickiness}>
                        <div className='md:mb-5'>
                            <SubmitButton type="submit" isDisabled={!isValid || loading} isSubmitting={isSubmitting || loading}>
                                Confirm
                            </SubmitButton>
                        </div>
                    </Widget.Footer>
                </Form >
            )}
        </Formik>
    </>;
}

export default Coinbase2FA;