import { Transition } from '@headlessui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmationStep from '../components/Wizard/Steps/ConfirmationStep';
import MainStep from '../components/Wizard/Steps/MainStep';
import SomeTestStep from '../components/Wizard/Steps/SomeTestStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import CodeStep from '../components/Wizard/Steps/CodeStep';
import TransactionLoadingPage from '../components/Wizard/Steps/TransactionLoadingPage';
import OverviewStep from '../components/Wizard/Steps/OverviewStep';
import ProccessingStep from '../components/Wizard/Steps/ProccessingStep';
import SuccessfulStep from '../components/Wizard/Steps/SuccessfulStep';
import FailedPage from '../components/Wizard/Steps/FailedPage';
import AccountConnectStep from '../components/Wizard/Steps/AccountConnectStep';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/solid';
import SwapConfirmationStep from '../components/Wizard/Steps/SwapConfirmation';
import WithdrawIntExchangeStep from '../components/Wizard/Steps/WithdrawIntExchangeStep';
import WithdrawExchangeStep from '../components/Wizard/Steps/WithdrawExhangeStep';
import APIKeyStep from '../components/Wizard/Steps/APIKeyStep';
import { AuthData, useAuthDataUpdate, useAuthState } from './auth';
import Wizard from '../components/Wizard/Wizard';
import { useUserExchangeDataUpdate, useUserExchangeState } from './userExchange';
import { UserExchangesResponse } from '../lib/bransferApiClients';
import TokenService from '../lib/TokenService';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import Router, { useRouter } from 'next/router';
import { useInterval } from '../hooks/useInyterval';
import { useWizardNavigation } from '../hooks/useWizardNavigation';

const WizardStateContext = React.createContext<WizardProvider>(null);

type WizardProvider = {
    nextStep: () => void,
    prevStep: () => void,
    loading: boolean,
    error: string
}

export enum StepStatus {
    Current = "current",
    Upcoming = "upcoming"
}

export type Step = {
    step?: WizardStep
    title: string,
    status: StepStatus,
    content: any,
    navigationDisabled?: boolean
}

export enum Flow {
    ApiCredentials = "api_credentials",
    OAuth = "o_auth2",
    None = "none"
}

export enum WizardPartType {
    Swap = "Swap",
    Auth = "Auth",
    Flow = "Flow",
    Withdrawal = "Withdrawal",
    PaymentStatus = "PaymentStatus",
}

const swapSteps: WizardPart = {
    type: WizardPartType.Swap,
    steps: [
        { title: "Swap", status: StepStatus.Upcoming, content: MainStep, navigationDisabled: true },
        { title: "Swap confirmation", status: StepStatus.Upcoming, content: SwapConfirmationStep }
    ]
}

export const authSteps: WizardPart = {
    type: WizardPartType.Auth,
    steps: [
        { title: "Email confirmation", status: StepStatus.Upcoming, content: EmailStep },
        { title: "Code", status: StepStatus.Upcoming, content: CodeStep, navigationDisabled: true },
    ]
}

export const apiKeyFlowSteps: WizardPart = {
    type: WizardPartType.Flow,
    steps: [
        { title: "Please provide Read-only API keys", status: StepStatus.Upcoming, content: APIKeyStep },
    ]
}

export const OAuthSteps: WizardPart = {
    type: WizardPartType.Flow,
    steps: [
        { title: "Please connect your account to Layerswap", status: StepStatus.Upcoming, content: AccountConnectStep },
    ]
}

export const NoneSteps: WizardPart = {
    type: WizardPartType.Flow,
    steps: []
}

export const withdrawalSteps: WizardPart = {
    type: WizardPartType.Withdrawal,
    steps: [
        { title: "Payment overview", status: StepStatus.Upcoming, content: OverviewStep, navigationDisabled: true },
    ]
}

export const paymentStatusSteps: WizardPart = {
    type: WizardPartType.PaymentStatus,
    steps: [
        { title: "Withdrawal", status: StepStatus.Upcoming, content: WithdrawExchangeStep },
        { title: "", status: StepStatus.Upcoming, content: ProccessingStep },
        { title: "", status: StepStatus.Upcoming, content: SuccessfulStep, navigationDisabled: true },
        { title: "", status: StepStatus.Upcoming, content: FailedPage, navigationDisabled: true },
    ]
}

export enum WizardStep {
    Swap,
    SwapConfirmation,
    Email,
    AuthCode,
    ApiKeyFlow,
    OAuthFlow,
    PaymentOVerview,
    Withdrawal,
    Processing,
    Success,
    Failed
}

const _wizard: Step[] = [
    { step: WizardStep.Swap, title: "Swap", status: StepStatus.Upcoming, content: MainStep, navigationDisabled: true },
    { title: "Swap confirmation", status: StepStatus.Upcoming, content: SwapConfirmationStep },
    { title: "Please provide Read-only API keys", status: StepStatus.Upcoming, content: APIKeyStep },
    { title: "Please provide Read-only API keys", status: StepStatus.Upcoming, content: APIKeyStep },
    { title: "Payment overview", status: StepStatus.Upcoming, content: OverviewStep, navigationDisabled: true },
    { title: "Withdrawal", status: StepStatus.Upcoming, content: WithdrawExchangeStep },
    { title: "", status: StepStatus.Upcoming, content: ProccessingStep },
    { title: "", status: StepStatus.Upcoming, content: SuccessfulStep, navigationDisabled: true },
]

export type WizardPart = {
    type: WizardPartType,
    steps: Step[]
}

export type WizardParts = {
    [key in WizardPartType]: WizardPart
}

export const initialWizard: WizardParts = {
    Swap: swapSteps,
    Auth: authSteps,
    Flow: { type: WizardPartType.Flow, steps: [] },
    Withdrawal: withdrawalSteps,
    PaymentStatus: paymentStatusSteps
}

export type StepPath = {
    part: WizardPartType,
    index: number
}

export function WizardProvider({ children }) {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const router = useRouter()
    const query = router?.query
    const { paymentId } = query

    const { currentStepPath, error, loading, moving, nextStep, wizard, prevStep } = useWizardNavigation()

    // useEffect(() => {
    //     if (paymentStatus == 'completed')
    //         setCurrentStep({ part: WizardPartType.PaymentStatus, index: 2 })
    //     if (paymentStatus == 'closed')
    //         setCurrentStep({ part: WizardPartType.PaymentStatus, index: 3 })
    // }, [paymentStatus])

    useEffect(() => {
        function handleResize() {
            if (wrapper.current !== null) {
                setWrapperWidth(wrapper.current.offsetWidth);
            }
        }
        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);


    const wrapper = useRef(null);

    const currentStep = wizard[currentStepPath.part].steps[currentStepPath.index]

    return (
        <WizardStateContext.Provider value={{ nextStep, prevStep, loading, error }}>
            <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative">
                <div className="relative">
                    <div className="overflow-hidden h-1 flex rounded-t-lg bg-ouline-blue">
                        <div style={{ width: "50%" }} className="shadow-none flex flex-col whitespace-nowrap justify-center bg-pink-primary"></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 place-content-end p-2" style={{ visibility: currentStep.navigationDisabled ? 'hidden' : 'visible' }}>
                    <>
                        <button onClick={prevStep} className="justify-self-start">
                            <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
                        </button>
                    </>
                </div>
                <div className='text-center text-xl text-darkblue-200'>
                    {currentStep.title}
                </div>
                <div className="p-2">
                    <div className="flex items-start overflow-hidden"
                        ref={wrapper}>
                        <div className="flex flex-nowrap min-h-440">
                            <PartWrapper currentStepPath={currentStepPath} moving={moving}
                                part={wizard.Swap} wrapperWidth={wrapperWidth} />
                            <PartWrapper currentStepPath={currentStepPath} moving={moving}
                                part={wizard.Auth} wrapperWidth={wrapperWidth} />
                            <PartWrapper currentStepPath={currentStepPath} moving={moving}
                                part={wizard.Flow} wrapperWidth={wrapperWidth} />
                            <PartWrapper currentStepPath={currentStepPath} moving={moving}
                                part={wizard.Withdrawal} wrapperWidth={wrapperWidth} />
                            <PartWrapper currentStepPath={currentStepPath} moving={moving}
                                part={wizard.PaymentStatus} wrapperWidth={wrapperWidth} />
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </WizardStateContext.Provider >
    );
}

function PartWrapper({ part, moving, currentStepPath, wrapperWidth }: { part: WizardPart, moving: string, currentStepPath: StepPath, wrapperWidth: number }) {

    return <>
        {
            part.steps.map((step, index) => <StepWrapper key={index}
                step={step}
                moving={moving}
                current={currentStepPath.part == part.type && currentStepPath.index == index}
                wrapperWidth={wrapperWidth}
            />)
        }
    </>
}


async function getNextPart({ currentPart, wizard, userExchanges, swapFormData, getUserExchanges, createSwap }: {
    currentPart: WizardPartType,
    wizard: WizardParts,
    userExchanges: UserExchangesResponse,
    swapFormData: SwapFormValues,
    getUserExchanges: (token: string) => Promise<UserExchangesResponse>,
    createSwap: () => void
}) {
    try {
        const authData = TokenService?.getAuthData()
        let nextStep: WizardPartType = currentPart;
        switch (currentPart) {
            case WizardPartType.Swap:
                nextStep = WizardPartType.Auth
                break;
            case WizardPartType.Auth:
                nextStep = WizardPartType.Flow
                break;
            case WizardPartType.Flow:
                nextStep = WizardPartType.Withdrawal
                break;
            case WizardPartType.Withdrawal:
                nextStep = WizardPartType.PaymentStatus
                break;
        }

        if (nextStep === WizardPartType.Auth && authData?.access_token)
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })

        if (nextStep === WizardPartType.Flow) {
            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
            const exchanges = userExchanges?.data || await (await getUserExchanges(authData?.access_token))?.data
            if (swapFormData?.exchange?.id && exchanges?.some(e => e.exchange === swapFormData?.exchange?.id && e.is_enabled)) {
                return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })
            }
        }

        if (nextStep === WizardPartType.Withdrawal) {
            if (!authData?.access_token) {
                return WizardPartType.Auth
            }
            await createSwap();
        }

        if (nextStep != currentPart && !wizard[nextStep].steps.length)
            return await getNextPart({ currentPart: nextStep, wizard, userExchanges, swapFormData, getUserExchanges, createSwap })

        return nextStep
    }
    catch (e) {
        throw e;
    }
}

function StepWrapper({ step, moving, wrapperWidth, current }: { step: Step, moving: string, wrapperWidth: number, current: boolean }) {
    console.log(step)
    console.log(current)
    return <>
        <Transition
            key={step.title}
            appear={false}
            unmount={false}
            show={current}
            enter="transform transition ease-in-out duration-2000"
            enterFrom={
                moving === "right"
                    ? `translate-x-96 opacity-0`
                    : `-translate-x-96 opacity-0`
            }
            enterTo={`opacity-100`}
            leave="transform transition ease-in-out duration-1000"
            leaveFrom={`translate-x-0 opacity-100`}
            leaveTo={
                moving === "right"
                    ? `-translate-x-96 opacity-0`
                    : `translate-x-96 opacity-0`
            }
            className="w-0 overflow-visible"
            as="div"
        >
            <div
                style={{ width: `${wrapperWidth}px`, minHeight: '440px' }}>
                <step.content current={current} />
            </div>
        </Transition>
    </>
}

export function useWizardState() {
    const data = React.useContext<WizardProvider>(WizardStateContext);

    if (data === undefined) {
        throw new Error('useWizardState must be used within a WizardStateProvider');
    }

    return data;
}
