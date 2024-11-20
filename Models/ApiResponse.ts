import { ApiError } from "./ApiError";
import { Exchange } from "./Exchange";
import { Network, Refuel, Token } from "./Network";
import { SwapStatus } from "./SwapStatus";

export class EmptyApiResponse {
    constructor(error?: ApiError) {
        this.error = error;
    }

    error?: ApiError;
}

export class ApiResponse<T> extends EmptyApiResponse {
    data?: T
}

export type DepositAddress = {
    type: string
    address: `0x${string}`;
}

export enum DepositAddressSource {
    UserGenerated = 0,
    Managed = 1
}

export type CreateSwapParams = {
    source_network: string,
    source_token: string,
    destination_network: string,
    destination_token: string
    refuel?: boolean,
    slippage?: number,
    destination_address: string,
    source_address?: string
    amount: string,
    reference_id?: string,
    source_exchange?: string
    destination_exchange?: string
    use_deposit_address: boolean
    app_name?: string,
}

export type SwapResponse = {
    swap: SwapItem;
    quote: SwapQuote
    refuel?: Refuel,
}

export type SwapItem = {
    id: string,
    created_date: string,
    source_network: Network,
    source_token: Token,
    source_exchange?: Exchange,
    destination_network: Network,
    destination_token: Token,
    destination_exchange?: Exchange,
    status: SwapStatus,
    source_address: `0x${string}`,
    destination_address: `0x${string}`,
    requested_amount: number,
    use_deposit_address: boolean
    transactions: Transaction[]
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    fail_reason?: string;
    metadata: {
        reference_id: string | null;
        app: string | null;
        sequence_number: number
    }
}

export type DepositAction = {
    amount: number,
    amount_in_base_units: string,
    call_data: `0x${string}` | string,
    fee: any | null,//TODO: clarify this field type
    network: Network,
    order: number,
    to_address?: `0x${string}`,
    token: Token,
    fee_token: Token,
    type: 'transfer' | 'manual_transfer',
}

export type Quote = {
    quote: SwapQuote,
    refuel: Refuel,
    reward: QuoteReward
}

export type QuoteReward = {
    amount: number,
    amount_in_usd: number,
    token: Token,
    network: Network
}

export type GetQuoteParams = {
    source_network: string,
    source_token: string,
    source_address?: string,
    destination_network: string,
    destination_token: string,
    destination_address: string,
    use_deposit_address: boolean,
    include_gas?: boolean,
    amount: number,
    refuel?: boolean
}

export type SwapQuote = {
    source_network?: Network,
    source_token?: Token,
    destination_network?: Network,
    destination_token?: Token,
    receive_amount: number,
    min_receive_amount: number,
    total_fee: number,
    total_fee_in_usd: number,
    blockchain_fee: number,
    service_fee: number,
    avg_completion_time: string,
    refuel_in_source?: number,
}

export type AddressBookItem = {
    address: string,
    date: string,
    networks: string[],
    exchanges: string[]
}

export type Transaction = {
    type: TransactionType,
    from: string,
    to: string,
    created_date: string,
    amount: number,
    transaction_hash: string,
    confirmations: number,
    max_confirmations: number,
    usd_value: number,
    usd_price: number,
    status: BackendTransactionStatus,
    fee_amount?: number | null,
    fee_token?: Token,
    timestamp?: string,
}

export enum TransactionType {
    Input = 'input',
    Output = 'output',
    Refuel = 'refuel'
}

export enum BackendTransactionStatus {
    Completed = 'completed',
    Failed = 'failed',
    Initiated = 'initiated',
    Pending = 'pending'
}

export enum TransactionStatus {
    Completed = 'completed',
    Failed = 'failed',
    Pending = 'pending'
}

export enum DepositType {
    Manual = 'manual',
    Wallet = 'wallet'
}

export type Fee = {
    min_amount: number,
    max_amount: number,
    fee_amount: number,
    deposit_type: DepositType
}

export type PublishedSwapTransactions = {
    state: {
        swapTransactions: {
            [key: string]: SwapTransaction
        }
    }
}


export type SwapTransaction = {
    hash: string,
    status: BackendTransactionStatus
}

export enum SwapType {
    OnRamp = "cex_to_network",
    OffRamp = "network_to_cex",
    CrossChain = "network_to_network"
}

export enum WithdrawType {
    Wallet = 'wallet',
    Manually = 'manually',
    Stripe = 'stripe',
    Coinbase = 'coinbase',
    External = 'external'
}

export enum SwapStatusInNumbers {
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Expired = 3,
    Delayed = 4,
    Cancelled = 5,
    SwapsWithoutCancelledAndExpired = '0&status=1&status=2&status=3&status=4'
}

export type Campaign = {
    id: number,
    name: string,
    display_name: string,
    token: Token,
    network: Network,
    percentage: number,
    start_date: string,
    end_date: string,
    min_payout_amount: number,
    total_budget: number,
    distributed_amount: number,
    reward_limit_period: number,
}

export type Reward = {
    user_reward: {
        period_pending_amount: number,
        total_amount: number,
        total_amount_in_usd: number
        total_pending_amount: number,
        position: number
    },
    next_airdrop_date: string | Date,
}

export type Leaderboard = {
    leaderboard: {
        address: string,
        amount: number,
        position: number
    }[],
    leaderboard_budget: number
}

export type RewardPayout = {
    date: string,
    transaction_id: string,
    amount: number
}
