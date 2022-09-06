import { FC } from "react"



export type BaseStepProps = {
    current: boolean
}

// export type Step = {
//     title: string,
//     content: FC<BaseStepProps>,
//     navigationDisabled?: boolean,
//     positionPercent: number,
//     dismissOnBack?: boolean,
//     onNext?: () => void
// }

export type FormSteps = "SwapForm" | "Email" | "Code" | "OffRampExchangeOAuth" | "ExchangeOAuth" | "ExchangeApiCredentials" | "SwapConfirmation"

export type SwapSteps = "Email" | "Code" | "Overview" | "Withdrawal" | "OffRampWithdrawal" | "Processing" | "Success" | "Failed" | "ExternalPayment"
export type LoginSteps = "Email" | "Code"

export type BaseWizard = {
    [key: string]: Step
}

export type FormWizardSteps = {
    [Property in FormSteps]: Step
}
export type SwapWizardSteps = {
    [Property in SwapSteps]: Step
}
export type LoginWizardSteps = {
    [Property in LoginSteps]: Step
}

export enum Step {
    MainForm,
    Email,
    Code,
    OAuth,
    OffRampOAuth,
    ApiKey,
    Confirm
}

export const ExchangeAuthorizationSteps: { [key: string]: Step } = {
    "api_credentials": Step.ApiKey,
    "o_auth2": Step.OAuth
}

export const OfframpExchangeAuthorizationSteps: { [key: string]: Step } = {
    "api_credentials": Step.ApiKey,
    "o_auth2": Step.OffRampOAuth
}

export class WizardStep<T> {
    Step: Step;
    Content: FC;
    onBack?: () => Step;
    onNext?: (data: T) => Promise<Step>;
}