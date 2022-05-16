import { Transition } from '@headlessui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import CardContainer from '../components/cardContainer';
import ConfirmationStep from '../components/Wizard/Steps/ConfirmationStep';
import MainStep from '../components/Wizard/Steps/MainStep';
import SomeTestStep from '../components/Wizard/Steps/SomeTestStep';
import UserLoginStep from '../components/Wizard/Steps/UserLoginStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import CodeInputStep from '../components/Wizard/Steps/CodeInputStep';
import TransactionLoadingPage from '../components/Wizard/Steps/TransactionLoadingPage';
import OverviewStep from '../components/Wizard/Steps/OverviewStep';
import ProccessingStep from '../components/Wizard/Steps/ProccessingStep';
import SuccessfulStep from '../components/Wizard/Steps/SuccessfulStep';
import FailedPage from '../components/Wizard/Steps/FailedPage';
import { SwapDataProvider, useSwapDataState } from './swap';
import AccountConnectStep from '../components/Wizard/Steps/AccountConnectStep';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/solid';
import SwapConfirmationStep from '../components/Wizard/Steps/SwapConfirmation';

const WizardStateContext = React.createContext<any>(null);

// const wizards = {
//     ''
// }

const defaultSteps = [
    { name: "Swap", status: "current", content: MainStep, navigationDisabled: true },
    { name: "Swap confirmation", status: "upcoming", content: SwapConfirmationStep },
    { name: "Email confirmation", status: "upcoming", content: EmailStep },
    { name: "Code", status: "upcoming", content: CodeInputStep },
    { name: "Authorize", status: "upcoming", content: AccountConnectStep },
    { name: "", status: "upcoming", content: TransactionLoadingPage, navigationDisabled: true },
]

const wizards = {
    'coinbase': [{ name: "Step 2", status: "upcoming", content: ConfirmationStep },],
    'bitfinex': [
        { name: "Step 2", status: "upcoming", content: SomeTestStep },
        { name: "Step 3", status: "upcoming", content: ConfirmationStep },],
}

export function WizardProvider({ children }) {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const [currentStep, setCurrentStep] = useState(0);

    const [steps, setSteps] = useState(defaultSteps);

    const [moving, setMoving] = useState("right");
    const swapData = useSwapDataState()

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
        // if (swapData?.exchange) {
        //     setSteps([
        //         ...defaultSteps,
        //         ...(wizards[swapData.exchange.id] || [])])
        // }
    }, [swapData])

    const wrapper = useRef(null);



    const nextStep = useCallback(async () => {
        setMoving("right");
        const currentStepIndex = steps.findIndex(s => s.status == 'current')
        if (steps[currentStepIndex + 1])
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
        <WizardStateContext.Provider value={{ nextStep, prevStep }}>
            <div className="bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative  border-t-4 border-ouline-blue">
                <div className='grid grid-cols-2 gap-4 place-content-end p-2'>
                    {
                        !steps.find(s => s.status === 'current')?.navigationDisabled &&
                        <>
                            <button onClick={prevStep} className="justify-self-start">
                                <ArrowLeftIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
                            </button>
                            <button onClick={nextStep} className="justify-self-end">
                                <ArrowRightIcon className='h-5 w-5 text-darkblue-200 hover:text-ouline-blue cursor-pointer' />
                            </button>
                        </>
                    }
                </div>
                <div className='text-center text-lg text-darkblue-200'>
                    {steps.find(s => s.status === 'current').name}
                </div>
                <div className="p-2">
                    <div className="flex items-start overflow-hidden"
                        ref={wrapper}>
                        <div className="flex flex-nowrap min-h-440">
                            {
                                steps.map(step => <Transition
                                    key={step.name}
                                    appear={false}
                                    unmount={false}
                                    show={step.status === 'current'}
                                    enter="transform transition ease-in-out duration-1000"
                                    enterFrom={
                                        moving === "right"
                                            ? `translate-x-96 opacity-0`
                                            : `-translate-x-96 opacity-0`
                                    }
                                    enterTo={`translate-x-0 opacity-100`}
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
                                        <step.content />
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
