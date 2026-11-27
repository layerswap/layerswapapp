import type { NetworkType, GaslessStandard } from './network';

export class LayerswapNetwork {
    name: string;
    display_name: string;
    logo?: string;
    chain_id: string | null;
    node_url: string;
    nodes?: string[];
    type: string;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata?: LayerswapNetworkMetadata;
    token?: LayerswapToken;
}

export class Network extends LayerswapNetwork {
    declare type: NetworkType;
    declare logo: string;
    declare token?: Token;
    declare metadata?: Metadata;
    declare nodes: string[];
    deposit_methods: string[];
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class NetworkWithTokens extends Network {
    tokens: Token[];
}

export class LayerswapToken {
    /** Canonical identifier used in Layerswap API requests and lookups. */
    symbol: string;
    /** User-facing ticker used in labels and messages. */
    asset: string;
    display_asset?: string;
    logo?: string;
    //TODO may be plain string
    contract: string | null | undefined;
    decimals: number;
}

export class Token extends LayerswapToken {
    declare logo: string;
    price_in_usd: number;
    precision: number;
    listing_date: string;
    status?: 'active' | 'inactive' | 'not_found';
    supports_gasless_deposit?: boolean;
    gasless_standard?: GaslessStandard | null;
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class LayerswapNetworkMetadata {
    evm_oracle_contract?: `0x${string}` | null;
    evm_multicall_contract?: string | null;
    evm_balance_viewer_contract?: string | null;
    watchdog_contract?: string | null;
}

export class Metadata extends LayerswapNetworkMetadata {
    listing_date: string;
}

export class NetworkRoute extends Network {
    tokens: Token[]
    refuel_asset?: string | null;
}
