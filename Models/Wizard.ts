import { FC } from "react"

export const ExchangeAuthorizationSteps: { [key: string]: FormSteps } = {
    "api_credentials": "ExchangeApiCredentials",
    "o_auth2": "ExchangeOAuth"
}
export const OfframpExchangeAuthorizationSteps: { [key: string]: FormSteps } = {
    "api_credentials": "ExchangeApiCredentials",
    "o_auth2": "OffRampExchangeOAuth"
}

export type BaseStepProps = {
    current: boolean
}

export type Step = {
    title: string,
    content: FC<BaseStepProps>,
    navigationDisabled?: boolean,
    positionPercent: number,
    dismissOnBack?: boolean,
}

export type FormSteps = "SwapForm" | "Email" | "Code"| "OffRampExchangeOAuth" | "ExchangeOAuth" | "ExchangeApiCredentials" | "SwapConfirmation"

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

