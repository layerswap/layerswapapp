import { FC } from "react"

export type FormSteps = "SwapForm" | "Email" | "Code" | "OffRampExchangeOAuth" | "ExchangeOAuth" | "ExchangeApiCredentials" | "SwapConfirmation"

export type SwapSteps = "Email" | "Code" | "Overview" | "Withdrawal" | "OffRampWithdrawal" | "Processing" | "Success" | "Failed" | "ExternalPayment"
export type LoginSteps = "Email" | "Code"

export type BaseWizard = {
    [key: string]: SwapCreateStep
}

export type FormWizardSteps = {
    [Property in FormSteps]: SwapCreateStep
}
export type SwapWizardSteps = {
    [Property in SwapSteps]: SwapCreateStep
}
export type LoginWizardSteps = {
    [Property in LoginSteps]: SwapCreateStep
}

export enum SwapCreateStep {
    MainForm = "MainForm",
    Email = "Email",
    Code = "Code",
    OAuth = "OAuth",
    OffRampOAuth = "OffRampOAuth",
    ApiKey = "ApiKey",
    Confirm = "Confirm",
    TwoFactor = "TwoFactor",
    ActiveSwapLimit = 'ActiveSwapLimit'

}

export enum SwapWithdrawalStep {
    ExternalPayment = "ExternalPayment",
    Withdrawal = "Withdrawal",
    OffRampWithdrawal = "OffRampWithdrawal",
    WalletConnect = "WalletConnect",
    VerifyAddress = "VerifyAddress",
    TransferFromWallet = "TransferFromWallet",
    Processing = "Processing",
    Success = "Success",
    Failed = "Failed",
    Delay = "Delay"
}

export enum AuthStep {
    Email = "Email",
    Code = "Code"
}

export type Steps = AuthStep | SwapWithdrawalStep | SwapCreateStep

export const ExchangeAuthorizationSteps: { [key: string]: SwapCreateStep } = {
    "api_credentials": SwapCreateStep.ApiKey,
    "o_auth2": SwapCreateStep.OAuth
}

export const OfframpExchangeAuthorizationSteps: { [key: string]: SwapCreateStep } = {
    "api_credentials": SwapCreateStep.ApiKey,
    "o_auth2": SwapCreateStep.OffRampOAuth
}

export class WizardStep<T> {
    Name: T;
    Content: FC;
    onBack?: () => void;
    onNext?: (data?: any) => Promise<void>;
    positionPercent: number;
}