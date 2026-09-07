export enum NetworkType {
  EVM = 'evm',
  Starknet = 'starknet',
  Solana = 'solana',
  Cosmos = 'cosmos',
  StarkEx = 'starkex',
  TON = 'ton',
  Fuel = 'fuel',
  Bitcoin = 'bitcoin',
  Tron = 'tron',
  Hyperliquid = 'hyperliquid',
  Polymarket = 'polymarket',
}

type RefuelToken = {
  /** Canonical identifier used in Layerswap API requests and lookups. */
  symbol: string;
  /** User-facing ticker used in labels and messages. */
  asset: string;
  display_asset?: string;
  logo: string;
  contract: string | null | undefined;
  decimals: number;
  price_in_usd: number;
  precision: number;
  listing_date: string;
  status?: 'active' | 'inactive' | 'not_found';
  supports_gasless_deposit?: boolean;
  source_rank?: number;
  destination_rank?: number;
};

type RefuelNetwork = {
  name: string;
  display_name: string;
  logo: string;
  chain_id: string | null;
  node_url: string;
  nodes: string[];
  type: NetworkType;
  transaction_explorer_template: string;
  account_explorer_template: string;
  metadata?: {
    evm_oracle_contract?: `0x${string}` | null;
    evm_multicall_contract?: string | null;
    listing_date: string;
    zks_paymaster_contract?: `0x${string}` | null;
    watchdog_contract?: string | null;
  };
  deposit_methods: string[];
  token?: RefuelToken;
  source_rank?: number;
  destination_rank?: number;
};

export type Refuel = {
  network: RefuelNetwork;
  token: RefuelToken;
  amount: number;
  amount_in_usd: number;
};

export type AvailableSourceNetworkTypes = {
  all: true;
  networks?: never;
} | {
  all: false;
  networks: string[];
};
