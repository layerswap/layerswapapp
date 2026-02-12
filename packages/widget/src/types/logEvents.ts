import { SwapStatus } from "@/Models/SwapStatus";

export interface BaseErrorProps {
    name?: string;
    message: string;
    stack?: string;
    cause?: unknown;
}

export type AlertUIEvent = { type: 'AlertUI' } & BaseErrorProps;

export type WidgetError = ({ type: 'ErrorFallback' | 'NotFound' | 'SwapFailed' } & BaseErrorProps)

export type APIError = ({
    type: 'APIError'
    endpoint: string,
    status: string,
    statusText: string,
    responseData: any,
    requestUrl: string,
    requestMethod: string,
} & BaseErrorProps)

export type BalanceError = ({
    type: 'BalanceResolverError' | 'BalanceProviderError'
    network?: string;
    node_url?: string;
    address?: string;
    message?: string;
    error_categories?: (string | undefined)[];
    error_category?: string;
    error_codes?: (string | undefined)[];
    http_statuses?: (number | undefined)[];
    failed_tokens?: any[];
    nodes?: string[];
    request_url?: string;
    response_data?: unknown;
    response_status?: number;
    response_status_text?: string;
    error_code?: string;
} & BaseErrorProps)

export type GasFeeError = ({ type: 'MaxPriorityFeePerGasError' | 'FeesPerGasError' | 'GasPriceError' | 'GasProviderError' } & BaseErrorProps)

export type WalletWithdrawalError = ({
    type: 'SwapWithdrawalError' | 'TransactionFailed' | 'SwapCatchupError'
    swapId?: string;
    transactionHash?: string;
    fromAddress?: string;
    toAddress?: string;
} & BaseErrorProps)


export type TransactionNotDetectedError = ({ type: 'TransactionNotDetected' } & BaseErrorProps)

export type ChainError = ({ type: 'ChainError' } & BaseErrorProps)

export type TransferError = ({ type: 'TransferError' } & BaseErrorProps)

export type WalletError = ({ type: 'WalletError' } & BaseErrorProps)


export type ErrorEventType = WidgetError | APIError | BalanceError | GasFeeError | WalletWithdrawalError | AlertUIEvent | TransactionNotDetectedError | ChainError | TransferError | WalletError;

export type SwapStatusEvent = {
    type: SwapStatus;
    swapId: string;
    path?: string;
};