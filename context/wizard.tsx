import { Transition } from '@headlessui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmationStep from '../components/Wizard/Steps/ConfirmationStep';
import MainStep from '../components/Wizard/Steps/MainStep';
import SomeTestStep from '../components/Wizard/Steps/SomeTestStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import CodeInputStep from '../components/Wizard/Steps/CodeInputStep';
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

const WizardStateContext = React.createContext<any>(null);

type Step = {
    title: string,
    status: string,
    content: any,
    navigationDisabled?: boolean
}

const defaultSteps: Step[] = [
    { title: "Please connect your account to Layerswap", status: "upcoming", content: AccountConnectStep },
    { title: "", status: "upcoming", content: ProccessingStep, navigationDisabled: true },
    { title: "", status: "upcoming", content: SuccessfulStep, navigationDisabled: true },
]

const swapSteps: Step[] = [
    { title: "Swap", status: "current", content: MainStep, navigationDisabled: true },
    { title: "Swap confirmation", status: "upcoming", content: SwapConfirmationStep }
]

const authSteps: Step[] = [
    { title: "Email confirmation", status: "upcoming", content: EmailStep },
    { title: "Code", status: "upcoming", content: CodeInputStep },
]

const _apiKeyFlowSteps: Step[] = [
    { title: "Please provide Read-only API keys", status: "upcoming", content: APIKeyStep },
    { title: "Please connect your account to Layerswap", status: "upcoming", content: AccountConnectStep },
]

const withdrawalSteps: Step[] = [
    { title: "Withdrawal", status: "upcoming", content: WithdrawExchangeStep },
    { title: "", status: "upcoming", content: ProccessingStep, navigationDisabled: true },
    { title: "", status: "upcoming", content: SuccessfulStep, navigationDisabled: true },
]

const apiKeyFlowSteps: Step[] = [
    { title: "Swap", status: "current", content: MainStep, navigationDisabled: true },
    { title: "Swap confirmation", status: "upcoming", content: SwapConfirmationStep },
    { title: "Email confirmation", status: "upcoming", content: EmailStep },
    { title: "Code", status: "upcoming", content: CodeInputStep },
    { title: "Please provide Read-only API keys", status: "upcoming", content: APIKeyStep },
    { title: "Please connect your account to Layerswap", status: "upcoming", content: AccountConnectStep },
    { title: "Withdrawal", status: "upcoming", content: WithdrawExchangeStep },
    { title: "", status: "upcoming", content: ProccessingStep, navigationDisabled: true },
    { title: "", status: "upcoming", content: SuccessfulStep, navigationDisabled: true },
]

const wizards = {
    // 'coinbase': [{ title: "Step 2", status: "upcoming", content: ConfirmationStep },],
    'binance': apiKeyFlowSteps,
    // 'bitfinex': [
    //     { title: "Step 2", status: "upcoming", content: SomeTestStep },
    //     { title: "Step 3", status: "upcoming", content: ConfirmationStep },],
}

export function WizardProvider({ children }) {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const [currentStep, setCurrentStep] = useState<Step | undefined>();

    const [steps, setSteps] = useState(swapSteps);

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
        if (swapData?.exchange && wizards[swapData.exchange.id]) {
            setSteps(wizards[swapData.exchange.id])
        }
    }, [swapData])

    const wrapper = useRef(null);

    const nextStep = useCallback(async () => {
        setMoving("right");
        const currentStepIndex = steps.findIndex(s => s.status == 'current')
        if (steps[currentStepIndex + 1]) {
            setCurrentStep(steps[currentStepIndex + 1])
            setSteps((old) =>
                old.map((v, i) => {
                    if (i === currentStepIndex) {
                        v.status = "complete";
                    } else if (i === currentStepIndex + 1) {
                        v.status = "current";
                    }
                    return v;
                })
            );
        }

    }, [steps])

    const prevStep = useCallback(async () => {
        setMoving("left");
        const currentStepIndex = steps.findIndex(s => s.status == 'current')
        if (steps[currentStepIndex - 1])
            setSteps((old) =>
                old.map((v, i) => {
                    if (i === currentStepIndex) {
                        v.status = "complete";
                    } else if (i === currentStepIndex - 1) {
                        v.status = "current";
                    }
                    return v;
                })
            );
    }, [steps])
    
    return (
        <WizardStateContext.Provider value={{ nextStep, prevStep, }}>
            <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative  border-t-4 border-ouline-blue">
                <div className="grid grid-cols-2 gap-4 place-content-end p-2" style={{ visibility: steps.find(s => s.status === 'current')?.navigationDisabled ? 'hidden' : 'visible' }}>
                    <>
                        <button onClick={prevStep} className="justify-self-start">
                            <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
                        </button>
                    </>
                </div>
                <div className='text-center text-xl text-darkblue-200'>
                    {steps.find(s => s.status === 'current').title}
                </div>
                <div className="p-2">
                    <div className="flex items-start overflow-hidden"
                        ref={wrapper}>
                        <div className="flex flex-nowrap min-h-440">
                            {
                                steps.map(step => <Transition
                                    key={step.title}
                                    appear={false}
                                    unmount={false}
                                    show={step.status === 'current'}
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
                                        <step.content current={step.status === 'current'} />
                                    </div>
                                </Transition>)
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
