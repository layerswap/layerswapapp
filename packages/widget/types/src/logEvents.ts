import { SwapStatus } from './SwapStatus';

export interface BaseErrorProps {
  name?: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export type AlertUIEvent = { type: 'AlertUI' } & BaseErrorProps;

export type WidgetError = ({ type: 'ErrorFallback' | 'NotFound' | 'SwapFailed' } & BaseErrorProps);

export type APIError = ({
  type: 'APIError';
  endpoint: string;
  status: string;
  statusText: string;
  responseData: any;
  requestUrl: string;
  requestMethod: string;
} & BaseErrorProps);

export type BalanceError = ({
  type: 'BalanceResolverError' | 'BalanceProviderError';
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
} & BaseErrorProps);

export type GasFeeError = ({ type: 'MaxPriorityFeePerGasError' | 'FeesPerGasError' | 'GasPriceError' | 'GasProviderError' } & BaseErrorProps);

export type WalletWithdrawalError = ({
  type: 'SwapWithdrawalError' | 'TransactionFailed' | 'SwapCatchupError';
  swapId?: string;
  transactionHash?: string;
  fromAddress?: string;
  toAddress?: string;
} & BaseErrorProps);

export type GasMiscalculationError = ({
  type: 'GasMiscalculation';
  requestedAmount: number;
  walletBalance: number;
  calculatedGas: number;
  difference: number;
  network?: string;
  token?: string;
} & BaseErrorProps);

export type TransactionNotDetectedError = ({
  type: 'TransactionNotDetected';
  swapId?: string;
  transactionHash?: string;
  network?: string;
} & BaseErrorProps);
export type ChainError = ({ type: 'ChainError' } & BaseErrorProps);
export type TransferError = ({ type: 'TransferError' } & BaseErrorProps);
export type WalletError = ({ type: 'WalletError' } & BaseErrorProps);

export type ErrorEventType = WidgetError | APIError | BalanceError | GasFeeError | WalletWithdrawalError | GasMiscalculationError | AlertUIEvent | TransactionNotDetectedError | ChainError | TransferError | WalletError;

export type SwapStatusEvent = {
  type: SwapStatus;
  swapId: string;
  path?: string;
  /** UI-resolved phase; it can reach completed before the API status catches up. */
  phase?: string;
  fromAddress?: string;
  toAddress?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  sourceToken?: string;
  destinationToken?: string;
};

/** Stable, query-friendly stages in the user-facing swap journey. */
export type SwapLifecycleStage =
  | 'form'
  | 'swap_creation'
  | 'wallet_connection'
  | 'network_switch'
  | 'wallet_action'
  | 'input_transfer'
  | 'output_transfer'
  | 'refund'
  | 'swap'
  | 'flow';

export type SwapLifecycleOutcome =
  | 'started'
  | 'pending'
  | 'succeeded'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'delayed'
  | 'abandoned'
  | 'stalled';

/**
 * Semantic steps emitted by the widget. These deliberately describe user and
 * application intent instead of mirroring raw console messages or API calls.
 */
export type SwapLifecycleStep =
  | 'form_submitted'
  | 'form_confirmation_cancelled'
  | 'swap_creation_started'
  | 'swap_created'
  | 'swap_creation_failed'
  | 'wallet_connection_started'
  | 'wallet_connected'
  | 'wallet_connection_failed'
  | 'network_switch_started'
  | 'network_switched'
  | 'network_switch_rejected'
  | 'network_switch_failed'
  | 'awaiting_wallet_action'
  | 'wallet_prompt_opened'
  | 'wallet_action_rejected'
  | 'wallet_action_failed'
  | 'transaction_submitted'
  | 'gasless_authorization_submitted'
  | 'awaiting_user_deposit'
  | 'deposit_address_copied'
  | 'input_transaction_detected'
  | 'input_transfer_pending'
  | 'input_transfer_confirmed'
  | 'output_transfer_pending'
  | 'output_transaction_detected'
  | 'output_settling'
  | 'swap_delayed'
  | 'swap_completed'
  | 'swap_failed'
  | 'swap_expired'
  | 'swap_cancelled'
  | 'refund_pending'
  | 'refund_completed'
  | 'retry_requested'
  | 'flow_closed'
  | 'flow_error'
  | 'suspected_stall';

export type SwapLifecycleEvent = {
  step: SwapLifecycleStep;
  stage: SwapLifecycleStage;
  outcome: SwapLifecycleOutcome;
  path: string;
  swapId?: string;
  reasonCode?: string;
  reason?: string;
  action?: string;
  provider?: string;
  transactionHash?: string;
  inputTransactionHash?: string;
  outputTransactionHash?: string;
  refundTransactionHash?: string;
  status?: string;
  phase?: string;
  depositMethod?: string;
  requestedAmount?: string;
  fromAddress?: string;
  toAddress?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  sourceToken?: string;
  destinationToken?: string;
  confirmations?: number;
  maxConfirmations?: number;
};
