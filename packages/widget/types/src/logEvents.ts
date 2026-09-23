import { SwapStatus } from './SwapStatus';

export interface BaseErrorProps {
  /** Shared only by observations of the same thrown error object/cause. */
  occurrenceId?: string;
  /** Normalized wallet/provider cause, shared by execution and error reporting. */
  reasonCode?: WalletErrorReasonCode;
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
export type CallbackError = ({ type: 'CallbackError' } & BaseErrorProps);
/**
 * A side effect that runs after its operation already succeeded (for example a
 * persisted store write after a swap was created) threw. The operation itself
 * is not affected; the event only reports the failed step.
 */
export type SideEffectError = ({
  type: 'SideEffectError';
  /** e.g. 'extendedRoutes.setRecord' */
  operation: string;
  swapId?: string;
} & BaseErrorProps);

export type ErrorEventType = WidgetError | APIError | BalanceError | GasFeeError | WalletWithdrawalError | GasMiscalculationError | AlertUIEvent | TransactionNotDetectedError | ChainError | TransferError | WalletError | CallbackError | SideEffectError;

/**
 * One notification per (swapId, type) per attempt. `type` is the API status.
 * All other fields are a snapshot at transition time and never trigger a
 * notification. UI phase transitions, including completion before the API
 * confirms and input-transaction failure, are reported on `onSwapLifecycle`.
 */
export type SwapStatusEvent = {
  type: SwapStatus;
  swapId: string;
  path?: string;
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
  | 'refunded'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'delayed'
  | 'abandoned'
  | 'stalled'
  | 'blocked';

/**
 * Why the transfer step cannot proceed without a thrown error. Bounded so
 * dashboards can group by cause across networks and wallets.
 */
export type TransferBlockedReasonCode =
  | 'rpc_unhealthy'
  | 'same_account_required'
  | 'wallet_unsupported_for_network'
  | 'deposit_actions_unavailable'
  | 'swap_error'
  | 'insufficient_balance'
  | 'insufficient_gas'
  | 'gasless_unavailable'
  | 'critical_price_impact';

/**
 * Normalized wallet/provider failure causes. The raw provider code stays in
 * `errorCode`; API error codes are already bounded and pass through unchanged.
 */
export type WalletErrorReasonCode =
  | 'user_rejected'
  | 'unauthorized'
  | 'insufficient_funds'
  | 'gas_estimation_failed'
  | 'contract_reverted'
  | 'nonce_or_replacement'
  | 'chain_not_added'
  | 'wallet_disconnected'
  | 'unsupported_method'
  | 'invalid_parameters'
  | 'internal_rpc_error'
  | 'network_error'
  | 'timeout'
  | 'unknown_error';

/**
 * Mutually exclusive UI phase observations. Consumers dedupe these in one
 * shared slot per swap, so a real A → B → A recovery is still delivered while
 * a replay of A alone is not.
 */
export const SWAP_LIFECYCLE_PHASE_STEPS = [
  'awaiting_wallet_action', 'awaiting_user_deposit', 'input_transfer_pending', 'output_transfer_pending',
  'output_settling', 'swap_completed', 'swap_failed', 'swap_delayed', 'swap_expired', 'swap_cancelled',
  'refund_pending', 'refund_completed',
] as const;

/** Each on-chain transaction observation owns its own dedupe slot per swap. */
export const SWAP_LIFECYCLE_TRANSACTION_STEPS = [
  'input_transaction_detected', 'input_transfer_confirmed', 'output_transaction_detected',
] as const;

/**
 * Every other step: user actions, attempts, their results and diagnostics.
 * These are never slotted, so every emission is delivered by every consumer.
 */
export const SWAP_LIFECYCLE_REPEATABLE_STEPS = [
  'form_submitted', 'form_confirmation_cancelled',
  'swap_creation_started', 'swap_created', 'swap_creation_failed',
  'wallet_connection_started', 'wallet_connected', 'wallet_connection_failed',
  'network_switch_started', 'network_switched', 'network_switch_rejected', 'network_switch_failed',
  'wallet_prompt_opened', 'wallet_action_rejected', 'wallet_action_failed',
  'transaction_submitted', 'gasless_authorization_submitted', 'deposit_address_copied',
  'retry_requested', 'transfer_blocked', 'flow_closed', 'flow_error', 'suspected_stall',
] as const;

export type SwapLifecyclePhaseStep = (typeof SWAP_LIFECYCLE_PHASE_STEPS)[number];
export type SwapLifecycleTransactionStep = (typeof SWAP_LIFECYCLE_TRANSACTION_STEPS)[number];
export type SwapLifecycleRepeatableStep = (typeof SWAP_LIFECYCLE_REPEATABLE_STEPS)[number];

/**
 * Semantic steps emitted by the widget. These deliberately describe user and
 * application intent instead of mirroring raw console messages or API calls.
 *
 * The union is derived from the three category tuples above: a new step must
 * be placed in exactly one of them or it does not exist as a step.
 */
export type SwapLifecycleStep = SwapLifecyclePhaseStep | SwapLifecycleTransactionStep | SwapLifecycleRepeatableStep;

// Compile-time guard that the categories do not overlap (a step listed twice
// fails the `never` constraint); tests/lifecycle-steps.test.mjs checks the same
// property on the built output.
type AssertNever<T extends never> = T;
type OverlappingSwapLifecycleSteps =
  | Extract<SwapLifecyclePhaseStep, SwapLifecycleTransactionStep | SwapLifecycleRepeatableStep>
  | Extract<SwapLifecycleTransactionStep, SwapLifecycleRepeatableStep>;
type SwapLifecycleCategoriesAreDisjoint = AssertNever<OverlappingSwapLifecycleSteps>;

/**
 * User or application actions that begin a new attempt. Earlier observations
 * for the same swap no longer suppress later ones once any of these is seen.
 * Always a subset of the repeatable steps.
 */
export const SWAP_LIFECYCLE_ATTEMPT_START_STEPS = [
  'swap_creation_started', 'wallet_connection_started', 'network_switch_started',
  'wallet_prompt_opened', 'retry_requested',
] as const satisfies readonly SwapLifecycleRepeatableStep[];

/**
 * Steps that show a widget instance watching a swap before its outcome: it
 * created the swap, showed it awaiting the user's transfer, or the user acted
 * on it. A swap never seen in one of these (opened from a URL or history) is
 * only being viewed, so its current phase is not an outcome of this session.
 */
export const SWAP_LIFECYCLE_TRACKING_STEPS = [
  'swap_created', 'awaiting_wallet_action', 'awaiting_user_deposit', ...SWAP_LIFECYCLE_ATTEMPT_START_STEPS,
] as const satisfies readonly SwapLifecycleStep[];

export type SwapLifecycleEvent = {
  occurrenceId?: string;
  step: SwapLifecycleStep;
  stage: SwapLifecycleStage;
  outcome: SwapLifecycleOutcome;
  path: string;
  swapId?: string;
  reasonCode?: string;
  reason?: string;
  /** Raw provider/API code behind a normalized `reasonCode`. */
  errorCode?: string;
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
