import { Transition } from '@headlessui/react';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import CardContainer from '../components/cardContainer';
import ConfirmationStep from '../components/Wizard/Steps/ConfirmationStep';
import MainStep from '../components/Wizard/Steps/MainStep';
import SomeTestStep from '../components/Wizard/Steps/SomeTestStep';
import UserLoginStep from '../components/Wizard/Steps/UserLoginStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import CodeInputStep from '../components/Wizard/Steps/CodeInputStep';
import { SwapDataProvider, useSwapDataState } from './swap';

const WizardStateContext = React.createContext<any>(null);

// const wizards = {
//     ''
// }
const wizards = {
    'coinbase': [{ name: "Step 2", status: "upcoming", content: ConfirmationStep },],
    'bitfinex': [
        { name: "Step 2", status: "upcoming", content: SomeTestStep },
        { name: "Step 3", status: "upcoming", content: ConfirmationStep },],
}

export function WizardProvider({ children }) {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const [steps, setSteps] = useState([
        { name: "Step 1", status: "current", content: MainStep },
        { name: "Step 2", status: "upcoming", content: UserLoginStep }
    ]);

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
        if (swapData?.exchange) {
            setSteps([
                { name: "Step 1", status: "current", content: MainStep },
                { name: "Step 2", status: "upcoming", content: UserLoginStep },
                ...(wizards[swapData.exchange.id] || [])])
        }
    }, [swapData])

    const wrapper = useRef(null);

    const updateFns = {
        // if we need to modify the missions, register those functions here
    };

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
            <CardContainer>
                <div
                    className="flex items-start overflow-hidden"
                    ref={wrapper}
                >
                    <div className="flex flex-nowrap min-h-440">

                        {
                            steps.map(step => <Transition
                                key={step.name}
                                appear={false}
                                unmount={false}
                                show={step.status === 'current'}
                                enter="transform transition ease-in-out duration-500"
                                enterFrom={
                                    moving === "right"
                                        ? `translate-x-96 opacity-0`
                                        : `-translate-x-96 opacity-0`
                                }
                                enterTo={`translate-x-0 opacity-100`}
                                leave="transform transition ease-in-out duration-500 "
                                leaveFrom={`translate-x-0 opacity-100`}
                                leaveTo={
                                    moving === "right"
                                        ? `-translate-x-full opacity-0`
                                        : `translate-x-full opacity-0`
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
            </CardContainer >
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
