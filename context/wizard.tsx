import React, { useEffect, useRef, useState } from 'react'
import MainStep from '../components/Wizard/Steps/MainStep';
import EmailStep from '../components/Wizard/Steps/EmailStep';
import CodeStep from '../components/Wizard/Steps/CodeStep';
import OverviewStep from '../components/Wizard/Steps/OverviewStep';
import ProccessingStep from '../components/Wizard/Steps/ProccessingStep';
import SuccessfulStep from '../components/Wizard/Steps/SuccessfulStep';
import FailedPage from '../components/Wizard/Steps/FailedPage';
import AccountConnectStep from '../components/Wizard/Steps/AccountConnectStep';
import SwapConfirmationStep from '../components/Wizard/Steps/SwapConfirmation';
import WithdrawExchangeStep from '../components/Wizard/Steps/WithdrawExhangeStep';
import APIKeyStep from '../components/Wizard/Steps/APIKeyStep';
import { useRouter } from 'next/router';
import { useWizardNavigation, WizardState } from '../hooks/useWizardNavigation';

const WizardStateContext = React.createContext<WizardProvider>(null);


type WizardProvider = {
    nextStep: () => void,
    prevStep: () => void,
    data: WizardState
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
        { title: "Swap confirmation", status: StepStatus.Upcoming, content: SwapConfirmationStep },
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
    index: number,
}

export function WizardProvider() {

    const [wrapperWidth, setWrapperWidth] = useState(1);

    const router = useRouter()
    const query = router?.query
    const { paymentId } = query

    const { data, nextStep, prevStep } = useWizardNavigation()


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

    return (
        <WizardStateContext.Provider value={{ nextStep, prevStep, data }} />
    );
}


export function useWizardState() {
    const data = React.useContext<WizardProvider>(WizardStateContext);

    if (data === undefined) {
        throw new Error('useWizardState must be used within a WizardStateProvider');
    }

    return data;
}
