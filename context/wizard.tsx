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
import { useSwapDataState } from './swap';
import AccountConnectStep from '../components/Wizard/Steps/AccountConnectStep';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/solid';
import SwapConfirmationStep from '../components/Wizard/Steps/SwapConfirmation';
import WithdrawIntExchangeStep from '../components/Wizard/Steps/WithdrawIntExchangeStep';
import WithdrawExchangeStep from '../components/Wizard/Steps/WithdrawExhangeStep';
import APIKeyStep from '../components/Wizard/Steps/APIKeyStep';
import { useAuthState } from './auth';
import Wizard from '../components/Wizard/Wizard';

const WizardStateContext = React.createContext<any>(null);

type Step = {
    title: string,
    status: string,
    content: any,
    navigationDisabled?: boolean
}

enum Flow {
    ApiCredentials = "api_credentials",
    OAuth = "o_auth2",
    None = "none"
}

enum WizardPartType {
    Swap = "Swap",
    Auth = "Auth",
    Flow = "Flow",
    Withdrawal = "Withdrawal",
}

const swapSteps: Step[] = [
    { title: "Swap", status: "current", content: MainStep, navigationDisabled: true },
    { title: "Swap confirmation", status: "upcoming", content: SwapConfirmationStep }
]

const authSteps: Step[] = [
    { title: "Email confirmation", status: "upcoming", content: EmailStep },
    { title: "Code", status: "upcoming", content: CodeStep, navigationDisabled: true },
]

const apiKeyFlowSteps: Step[] = [
    { title: "Please provide Read-only API keys", status: "upcoming", content: APIKeyStep },
    { title: "Please connect your account to Layerswap", status: "upcoming", content: AccountConnectStep },
]

const OAuthSteps: Step[] = [
    { title: "Test", status: "upcoming", content: SomeTestStep },
]

const withdrawalSteps: Step[] = [
    { title: "Withdrawal", status: "upcoming", content: WithdrawExchangeStep },
    { title: "", status: "upcoming", content: ProccessingStep, navigationDisabled: true },
    { title: "", status: "upcoming", content: SuccessfulStep, navigationDisabled: true },
]

type Wizard = {
    [key in WizardPartType]: Step[]
}

const initialWizard: Wizard = {
    Swap: swapSteps,
    Auth: authSteps,
    Flow: [],
    Withdrawal: withdrawalSteps
}

type StepPath = {
    part: WizardPartType,
    index: number
}

function StepWrapper({ step, moving, wrapperWidth, current }: { step: Step, moving: string, wrapperWidth: number, current: boolean }) {

    return <>
        <Transition
            key={step.title}
            appear={false}
            unmount={false}
            show={current}
            enter="transform transition ease-in-out duration-1000"
            enterFrom={
                moving === "right"
                    ? `translate-x-96 opacity-0`
                    : `-translate-x-96 opacity-0`
            }
            enterTo={`opacity-100`}
            leave="transform transition ease-in-out duration-500"
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
                style={{ width: `${wrapperWidth}px`, minHeight: '440px' }}
            >
                <step.content current={current} />
            </div>
        </Transition>
    </>
}


export function WizardProvider({ children }) {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const [currentStepPath, setCurrentStep] = useState<StepPath>({ part: WizardPartType.Swap, index: 0 })

    const [wizard, setWizard] = useState<Wizard>(initialWizard)

    const [moving, setMoving] = useState("right")

    const swapData = useSwapDataState()

    const { email, authData } = useAuthState()

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

    useEffect(() => {
        debugger
        switch (swapData?.exchange?.baseObject?.authorization_flow) {
            case Flow.ApiCredentials:
                setWizard(old => ({ ...old, Flow: apiKeyFlowSteps }))
                break;
            case Flow.OAuth:
                setWizard(old => ({ ...old, Flow: OAuthSteps }))
                break;
        }
    }, [swapData])

    const getNextPart = useCallback((currentPart: WizardPartType) => {
        let res: WizardPartType = currentPart;

        switch (currentPart) {
            case WizardPartType.Swap:
                if (authData?.access_token)
                    res = WizardPartType.Flow
                else
                    res = WizardPartType.Auth
                break;
            case WizardPartType.Auth:
                res = WizardPartType.Flow
                break;
            case WizardPartType.Flow:
                res = WizardPartType.Withdrawal
                break;
        }

        if (res != currentPart && !wizard[res].length)
            return getNextPart(res)

        return res

    }, [authData, wizard])

    const getPreviousPart = useCallback((currentPart: WizardPartType) => {
        let res: WizardPartType = currentPart;

        switch (currentPart) {
            case WizardPartType.Withdrawal:
                res = WizardPartType.Flow
            case WizardPartType.Flow:
                if (authData?.access_token)
                    res = WizardPartType.Swap
                else
                    res = WizardPartType.Auth
                break;
            case WizardPartType.Auth:
                res = WizardPartType.Swap
                break;
        }

        if (res != currentPart && !wizard[res].length)
            return getPreviousPart(res)

        return res
    }, [authData])

    const wrapper = useRef(null);

    const nextStep = useCallback(async () => {
        setMoving("right");
        if (currentStepPath.index >= wizard[currentStepPath.part].length - 1)
            setCurrentStep(old => ({ part: getNextPart(old.part), index: 0 }))
        else
            setCurrentStep(old => ({ part: old.part, index: old.index + 1 }))
    }, [currentStepPath])

    const prevStep = useCallback(async () => {
        setMoving("left");
        if (currentStepPath.index == 0)
            setCurrentStep(old => {
                const previousPart = getPreviousPart(old.part)
                return { part: previousPart, index: wizard[previousPart].length - 1 }
            })
        else
            setCurrentStep(old => ({ part: old.part, index: old.index - 1 }))
    }, [currentStepPath, wizard])

    const currentStep = wizard[currentStepPath.part][currentStepPath.index]

    return (
        <WizardStateContext.Provider value={{ nextStep, prevStep, }}>
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
                            {
                                wizard.Swap.map((step, index) => <StepWrapper key={index}
                                    step={step}
                                    moving={moving}
                                    current={currentStepPath.part == WizardPartType.Swap && currentStepPath.index == index}
                                    wrapperWidth={wrapperWidth}
                                />)
                            }
                            {
                                wizard.Auth.map((step, index) => <StepWrapper key={index}
                                    step={step}
                                    moving={moving}
                                    current={currentStepPath.part == WizardPartType.Auth && currentStepPath.index == index}
                                    wrapperWidth={wrapperWidth}
                                />)
                            }
                            {
                                wizard.Flow.map((step, index) => <StepWrapper key={index}
                                    step={step}
                                    moving={moving}
                                    current={currentStepPath.part == WizardPartType.Flow && currentStepPath.index == index}
                                    wrapperWidth={wrapperWidth}
                                />)
                            }
                            {
                                wizard.Withdrawal.map((step, index) => <StepWrapper key={index}
                                    step={step}
                                    moving={moving}
                                    current={currentStepPath.part == WizardPartType.Withdrawal && currentStepPath.index == index}
                                    wrapperWidth={wrapperWidth}
                                />)
                            }
                        </div>
                    </div>
                </div>
            </div>
            {children}
        </WizardStateContext.Provider >

    );
}



export function useWizardState() {
    const data = React.useContext(WizardStateContext);

    if (data === undefined) {
        throw new Error('useWizardState must be used within a WizardStateProvider');
    }

    return data;
}
