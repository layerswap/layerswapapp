import type { Network, Token } from './types';

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
  Stellar = 'stellar',
  Hyperliquid = 'hyperliquid',
  Polymarket = 'polymarket',
}

export type GaslessStandard = 'none' | 'eip3009' | 'erc2612' | 'permit2';

export type Refuel = {
  network: Network;
  token: Token;
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
