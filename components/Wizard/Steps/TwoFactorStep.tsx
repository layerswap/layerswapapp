import { InformationCircleIcon, LockClosedIcon } from '@heroicons/react/outline';
import { Form, Formik, FormikErrors, FormikProps } from 'formik';
import { useRouter } from 'next/router';
import { FC, useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import { useSwapDataState, useSwapDataUpdate } from '../../../context/swap';
import { useFormWizardaUpdate } from '../../../context/formWizardProvider';
import { SwapCreateStep } from '../../../Models/Wizard';
import NumericInput from '../../Input/NumericInput';
import SubmitButton from '../../buttons/submitButton';
import { ApiError, KnownwErrorCode } from '../../../Models/ApiError';
import Timer from '../../TimerComponent';
import { useTimerState } from '../../../context/timerContext';
import SpinIcon from '../../icons/spinIcon';
import Widget from '../Widget';
import { CalculateMinimalAuthorizeAmount } from '../../../lib/fees';

const TIMER_SECONDS = 120

interface CodeFormValues {
    Code: string
}

//TODO email code is almost identical create reusable component for email and two factor code verification
const TwoFactorStep: FC = () => {
    const initialValues: CodeFormValues = { Code: '' }
    const { swapFormData, swap } = useSwapDataState()
    const { processPayment } = useSwapDataUpdate()
    const router = useRouter();
    const { goToStep } = useFormWizardaUpdate<SwapCreateStep>()
    const [loading, setLoading] = useState(false)

    const { start: startTimer } = useTimerState()

    const transferAmount = `${swapFormData?.amount} ${swapFormData?.currency?.name}`
    const minimalAuthorizeAmount = CalculateMinimalAuthorizeAmount(swapFormData?.currency?.baseObject?.usd_price, Number(swapFormData?.amount))

    const formikRef = useRef<FormikProps<CodeFormValues>>(null);

    const handleSubmit = useCallback(async (values: CodeFormValues) => {
        try {
            await processPayment(swap.id, values.Code);
            router.push(`/${swap.id}`)
        }
        catch (error) {
            const data: ApiError = error?.response?.data?.error

            if (!data) {
                toast.error(error.message)
                return
            }
            //TODO create reusable error handler
            if (data.code === KnownwErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                goToStep(SwapCreateStep.OAuth)
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (data.code === KnownwErrorCode.INSUFFICIENT_FUNDS) {
                toast.error(`${swapFormData?.exchange?.name} error: You don't have that much.`)
            }
            else if (data.code === KnownwErrorCode.INVALID_CREDENTIALS) {
                goToStep(SwapCreateStep.OAuth)
            }
            else {
                toast.error(data.message)
            }
        }
    }, [swapFormData, swap, transferAmount])

    const handleResendTwoFACode = useCallback(async () => {
        setLoading(true)
        try {
            formikRef.current.setFieldValue("Code", "");
            await processPayment(swap.id)
        } catch (error) {
            const data: ApiError = error?.response?.data?.error

            if (!data) {
                toast.error(error.message)
                return
            }
            if (data.code === KnownwErrorCode.COINBASE_INVALID_2FA) {
                startTimer(TIMER_SECONDS)
                return
            }
            //TODO create reusable error handler
            if (data.code === KnownwErrorCode.COINBASE_AUTHORIZATION_LIMIT_EXCEEDED) {
                goToStep(SwapCreateStep.OAuth)
                toast.error(`You have not authorized minimum amount, for transfering ${transferAmount} please authirize at least ${minimalAuthorizeAmount}$`)
            }
            else if (data.code === KnownwErrorCode.INSUFFICIENT_FUNDS) {
                toast.error(`${swapFormData?.exchange?.name} error: You don't have that much.`)
            }
            else if (data.code === KnownwErrorCode.INVALID_CREDENTIALS) {
                goToStep(SwapCreateStep.OAuth)
            }
            else {
                toast.error(data.message)
            }
        }
        finally {
            setLoading(false)
        }
    }, [swap])


    return (
        <>
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
                    <Form className='flex text-primary-text h-full'>
                        <Widget>
                            <Widget.Content>
                                <div />
                                <div className="w-full flex-col justify-between flex h-full mt-4">
                                    <LockClosedIcon className='w-16 h-16 mt-auto text-primary self-center' />
                                    <div className='text-center mt-5'>
                                        <p className='mb-6 mt-2 pt-2 text-2xl font-bold text-white leading-6 text-center font-roboto'>
                                            {swapFormData?.exchange?.baseObject?.display_name} 2FA
                                        </p>
                                        <p className='text-center text-base px-2'>
                                            Please enter the 2 step verification code of your {swapFormData?.exchange?.baseObject?.display_name} account.
                                        </p>
                                    </div>
                                    <div className="relative rounded-md shadow-sm mt-5">
                                        <NumericInput
                                            pattern='^[0-9]*$'
                                            placeholder="XXXXXXX"
                                            maxLength={7}
                                            name='Code'
                                            onChange={e => {
                                                /^[0-9]*$/.test(e.target.value) && handleChange(e)
                                            }}
                                            className="leading-none h-12 text-2xl pl-5 text-white  focus:ring-primary text-center focus:border-primary border-darkblue-500 block
                                    placeholder:text-2xl placeholder:text-center tracking-widest placeholder:font-normal placeholder:opacity-50 bg-darkblue-700  w-full font-semibold rounded-md placeholder-gray-400"
                                        />
                                    </div>
                                    <span className="flex text-sm leading-6 items-center mt-1.5">
                                        <Timer seconds={120}
                                            waitingComponent={(remainingTime) => (
                                                <span>
                                                    Send again in
                                                    <span className='ml-1'>
                                                        {remainingTime}
                                                    </span>
                                                </span>
                                            )}>
                                            {!loading ? <span onClick={handleResendTwoFACode} className="decoration underline-offset-1 underline hover:no-underline decoration-primary hover:cursor-pointer">
                                                Resend code
                                            </span>
                                                : <SpinIcon className="animate-spin h-5 w-5" />}
                                        </Timer>
                                    </span>
                                </div>
                                <div className='p-4 bg-darkblue-700 mt-5 rounded-lg border border-darkblue-500'>
                                    <div className="flex items-center">
                                        <InformationCircleIcon className='h-5 w-5 text-primary-600 mr-3' />
                                        <label className="block text-sm md:text-base font-medium leading-6">To obtain the 2 step verification code, check:</label>
                                    </div>
                                    <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8">
                                        <li>your authenticator app (Google, Microsoft, or other), or</li>
                                        <li>text messages of the phone number associated with your Coinbase account</li>
                                    </ul>
                                </div>
                            </Widget.Content>
                            <Widget.Footer>

                                <SubmitButton type="submit" isDisabled={!isValid || loading} isSubmitting={isSubmitting}>
                                    Confirm
                                </SubmitButton>
                            </Widget.Footer>
                        </Widget>
                    </Form >
                )}
            </Formik>
        </>
    )
}

export default TwoFactorStep;
