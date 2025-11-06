import { SwapStatus } from "@/Models/SwapStatus";

export type Severity = "error" | "warning";
export interface BaseErrorProps {
    name?: string;
    message: string;
    stack?: string;
    cause?: unknown;
    where?: string;
    severity?: Severity;
}

export type AlertUIEvent = ({ type: 'AlertUI' } & BaseErrorProps) & BaseErrorProps;

export type WidgetError = ({ type: 'APIError' | 'ErrorFallback' | 'NotFound' | 'SwapFailed' } & BaseErrorProps)

export type BalanceError = ({ type: 'BalanceResolverError' | 'BalanceProviderError' } & BaseErrorProps)

export type GasFeeError = ({ type: 'MaxPriorityFeePerGasError' | 'FeesPerGasError' | 'GasPriceError' } & BaseErrorProps)

export type WalletWithdrawalError = ({ type: 'SwapWithdrawalError' | 'TransactionFailed' } & BaseErrorProps)

export type OnLongTransactionWarning = ({ type: 'LongTransactionWarning' } & BaseErrorProps)

export type SwapStatusEvent = {
    type: SwapStatus;
    swapId: string;
    path?: string;
};