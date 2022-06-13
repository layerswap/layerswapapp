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

export function WizardProvider({ children }) {

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

<<<<<<< HEAD
    useEffect(() => {
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
=======
>>>>>>> bransferui-merge

    const wrapper = useRef(null);


    return (
        <WizardStateContext.Provider value={{ nextStep, prevStep, data }}>
            {children}
        </WizardStateContext.Provider >

    );
}


export function useWizardState() {
    const data = React.useContext<WizardProvider>(WizardStateContext);

    if (data === undefined) {
        throw new Error('useWizardState must be used within a WizardStateProvider');
    }

    return data;
}
