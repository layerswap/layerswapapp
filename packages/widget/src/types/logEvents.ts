export type LogEventType =
    | 'ErrorFallback'
    | 'BalanceResolverError'
    | 'BalanceProviderError'
    | 'MaxPriorityFeePerGasError'
    | 'FeesPerGasError'
    | 'GasPriceError'
    | 'AlertUI'
    | 'SwapWithdrawalError'
    | 'TransactionFailed'
    | 'LongTransactionWarning'
    | 'APIError'
    | 'SwapFailed'
    | 'SwapInitiated'
    | 'NotFound';

export type LogGroup =
    | 'widgetError'
    | 'balanceError'
    | 'gasFeeError'
    | 'transactionNotDetected'
    | 'walletWithdrawalError'
    | 'longTransactionWarning';

export type LogEvent = {
    type: LogEventType;
    props?: Record<string, unknown>;
};

export const GROUP_MAP: Partial<Record<LogEventType, LogGroup>> = {
  ErrorFallback: 'widgetError',

  BalanceResolverError: 'balanceError',
  BalanceProviderError: 'balanceError',

  MaxPriorityFeePerGasError: 'gasFeeError',
  FeesPerGasError: 'gasFeeError',
  GasPriceError: 'gasFeeError',

  AlertUI: 'transactionNotDetected',

  SwapWithdrawalError: 'walletWithdrawalError',
  TransactionFailed: 'walletWithdrawalError',

  LongTransactionWarning: 'longTransactionWarning',
};