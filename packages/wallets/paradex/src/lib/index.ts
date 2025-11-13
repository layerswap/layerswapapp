import * as _Config from './config';
import type { ParadexConfig } from './config';
import * as _Signer from './ethereum-signer';

// Import both RPC versions
import * as RPCv07 from './RPCv07';
import * as RPCv08 from './RPCv08';

// Re-export types
export type { ParadexConfig } from './config';
export type { TypedData, EthereumSigner, Hex } from './ethereum-signer';

export const Config = { fetchConfig: _Config.fetchConfig };
export const Signer = { ethersSignerAdapter: _Signer.ethersSignerAdapter };

/**
 * Determines which RPC version to use based on the config
 */
function isRPCv07(config: ParadexConfig): boolean {
  return config.paradexFullNodeRpcUrl.includes('v0_7');
}

/**
 * Returns the appropriate Paradex modules (Account, ParaclearProvider, Paraclear) 
 * based on the config's RPC version
 */
export function getParadex(config: ParadexConfig) {
  if (isRPCv07(config)) {
    return {
      Account: RPCv07.Account,
      ParaclearProvider: RPCv07.ParaclearProvider,
      Paraclear: RPCv07.Paraclear,
    };
  }
  return {
    Account: RPCv08.Account,
    ParaclearProvider: RPCv08.ParaclearProvider,
    Paraclear: RPCv08.Paraclear,
  };
}