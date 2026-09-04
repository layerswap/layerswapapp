import { NetworkType, type Refuel, type WalletDepositMode } from './network';

export class Network {
    name: string;
    display_name: string;
    logo: string;
    chain_id: string | null;
    node_url: string;
    nodes: string[];
    type: NetworkType;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata?: Metadata;
    deposit_methods: string[];
    wallet_deposit_modes?: WalletDepositMode[];
    token?: Token;
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class NetworkWithTokens extends Network {
    tokens: Token[];
}

export class Token {
    /** Canonical identifier used in Layerswap API requests and lookups. */
    symbol: string;
    /** User-facing ticker used in labels and messages. */
    asset: string;
    display_asset?: string;
    logo: string;
    //TODO may be plain string
    contract: string | null | undefined;
    decimals: number;
    price_in_usd: number;
    precision: number;
    listing_date: string;
    status?: 'active' | 'inactive' | 'not_found';
    supports_gasless_deposit?: boolean;
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class Metadata {
    evm_oracle_contract?: `0x${string}` | null;
    evm_multicall_contract?: string | null;
    listing_date: string;
    zks_paymaster_contract?: `0x${string}` | null;
    watchdog_contract?: string | null;
}

export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[]
}

export class NetworkRouteToken extends Token {
    refuel?: Refuel
}
