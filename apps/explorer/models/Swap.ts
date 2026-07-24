
export type Token = {
    symbol: string;
    logo: string;
    contract: string;
    decimals: number;
    price_in_usd: number;
    precision: number;
    is_native: boolean;
}

export type Network = {
    name: string;
    display_name: string;
    logo: string;
    chain_id: string;
    node_url: string;
    type: string;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata: {
        listing_date: string;
        evm_oracle_contract: string;
        evm_multi_call_contract: string;
    };
    deposit_methods: string[];
}

export type Transaction = {
    from: string;
    to: string;
    timestamp: string;
    transaction_hash: string;
    confirmations: number;
    max_confirmations: number;
    amount: number;
    type: TransactionType,
    status: string;
    token: Token;
    network: Network;
}

export enum TransactionType {
    Input = 'input',
    Output = 'output',
    Refuel = 'refuel',
    Refunded = 'refund'
}

export type Swap = {
    id: string;
    created_date: string;
    source_network: Network;
    source_token: Token;
    source_exchange: {
        name: string;
        display_name: string;
        logo: string;
        metadata: {
            o_auth: {
                authorize_url: string;
                connect_url: string;
            };
            listing_date: string;
        };
    };
    destination_network: Network;
    destination_token: Token;
    destination_exchange: {
        name: string;
        display_name: string;
        logo: string;
        metadata: {
            o_auth: {
                authorize_url: string;
                connect_url: string;
            };
            listing_date: string;
        };
    };
    requested_amount: number;
    destination_address: string;
    deposit_mode: string;
    status: string;
    metadata: {
        reference_id: string;
        client_app: string;
        sequence_number: number;
        exchange_account: string;
    };
    transactions: Transaction[];
}

export type SwapData = {
    quote: {
        total_fee: number;
        total_fee_in_usd: number;
        receive_amount: number;
        min_receive_amount: number;
        blockchain_fee: number;
        deposit_gas_fee: number;
        service_fee: number;
        avg_completion_time: string;
    };
    refuel: {
        token: Token;
        network: Network;
        amount: number;
        amount_in_usd: number;
    };
    swap: Swap;
}