import { FC } from "react"

export type FormSteps = "SwapForm" | "OffRampExchangeOAuth" | "ExchangeOAuth" | "ExchangeApiCredentials" | "SwapConfirmation"

export type SwapSteps = "Overview" | "Withdrawal" | "OffRampWithdrawal" | "Processing" | "Success" | "Failed" | "ExternalPayment"

export type BaseWizard = {
    [key: string]: SwapCreateStep
}

export type FormWizardSteps = {
    [Property in FormSteps]: SwapCreateStep
}
export type SwapWizardSteps = {
    [Property in SwapSteps]: SwapCreateStep
}

export enum SwapCreateStep {
    MainForm = "MainForm",
    PendingSwaps = "PendingSwaps",
    AuthorizeCoinbaseWithdrawal = "AuthorizeCoinbaseWithdrawal",
    OffRampOAuth = "OffRampOAuth",
    ApiKey = "ApiKey",
    ActiveSwapLimit = 'ActiveSwapLimit',
    Error = "Error"
}

export enum SwapWithdrawalStep {
    Withdrawal = "Withdrawal",
    CoinbaseManualWithdrawal = "CoinbaseManualWithdrawal",
    SwapProcessing = 'SwapProcessing',
    ProcessingWalletTransaction = "ProcessingWalletTransaction",
    Success = "Success",
    Failed = "Failed",
    Error = "Error",
    Delay = "Delay",
    OffRampWithdrawal = "OffRampWithdrawal",
    WithdrawFromStarknet = "WithdrawFromStarknet",
    SelectWithdrawalType = "SelectWithdrawalType",
    CoinbaseInternalWithdrawal = "CoinbaseInternalWithdrawal",
}

export enum MenuStep {
    Menu = "Menu",
    Transactions = "Transactions",
    TransactionDetails = "Transaction Details"
}

export type Steps = SwapWithdrawalStep | SwapCreateStep | MenuStep

export const ExchangeAuthorizationSteps: { [key: string]: SwapCreateStep } = {
    "api_credentials": SwapCreateStep.ApiKey,
    "o_auth2": SwapCreateStep.AuthorizeCoinbaseWithdrawal
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
    positionPercent?: number;
}