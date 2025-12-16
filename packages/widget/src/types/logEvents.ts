import { TokenBalance } from "@/Models";
import { SwapStatus } from "@/Models/SwapStatus";

export interface BaseErrorProps {
    name?: string;
    message: string;
    stack?: string;
    cause?: unknown;
}

export type AlertUIEvent = { type: 'AlertUI' } & BaseErrorProps;

export type WidgetError = ({ type: 'APIError' | 'ErrorFallback' | 'NotFound' | 'SwapFailed' } & BaseErrorProps)

export type BalanceError = ({
    type: 'BalanceResolverError' | 'BalanceProviderError'
    network?: string;
    node_url?: string;
    address?: string;
    balances?: TokenBalance[];
    error_categories?: string[];
    error_category?: string;
    where?: string;
    message?: string;
} & BaseErrorProps)

export type GasFeeError = ({ type: 'MaxPriorityFeePerGasError' | 'FeesPerGasError' | 'GasPriceError' | 'GasProviderError' } & BaseErrorProps)

export type WalletWithdrawalError = ({ type: 'SwapWithdrawalError' | 'TransactionFailed' } & BaseErrorProps)

export type TransactionNotDetectedError = ({ type: 'TransactionNotDetected' } & BaseErrorProps)

export type ChainError = ({ type: 'ChainError' } & BaseErrorProps)

export type TransferError = ({ type: 'TransferError' } & BaseErrorProps)

export type WalletError = ({ type: 'WalletError' } & BaseErrorProps)


export type ErrorEventType = WidgetError | BalanceError | GasFeeError | WalletWithdrawalError | AlertUIEvent | TransactionNotDetectedError | ChainError | TransferError | WalletError;

export type SwapStatusEvent = {
    type: SwapStatus;
    swapId: string;
    path?: string;
};