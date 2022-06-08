import { FC } from "react"

export const ExchangeAuthorizationSteps = {
    "api_credentials": "ExchangeOAuth",
    "o_auth2": "ExchangeApiCredentials"
}

export type BaseStepProps = {
    current: boolean
}

export type Step = {
    title: string,
    content: FC<BaseStepProps>,
    navigationDisabled?: boolean,
    dismissOnBack?: boolean
}

export type FormSteps = "SwapForm" | "Email" | "Code" | "ExchangeOAuth" | "ExchangeApiCredentials" | "SwapConfirmation"

export type SwapSteps = "Email" | "Code" | "Overview" | "Withdrawal" | "Processing" | "Suiccess" | "Failed"

export type BaseWizard = {
    [key: string]: Step
}

export type FormWizardSteps = {
    [Property in FormSteps]: Step
}
export type SwapWizardSteps = {
    [Property in SwapSteps]: Step
}
