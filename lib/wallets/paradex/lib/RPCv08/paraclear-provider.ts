import * as Starknet from 'starknet';
import * as StarknetOld from 'starknet-old';

import type { ParadexConfig } from '../config';

export class DefaultProvider extends Starknet.RpcProvider {
  constructor(config: ParadexConfig) {
    super({
      nodeUrl: config.paradexFullNodeRpcUrl,
      chainId: Starknet.shortString.encodeShortString(
        config.paradexChainId,
      ) as Starknet.RpcProviderOptions['chainId'],
    });
  }
}
export class DefaultProviderOld extends StarknetOld.RpcProvider {
  constructor(config: ParadexConfig) {
    super({
      nodeUrl: config.paradexFullNodeRpcUrl,
      chainId: StarknetOld.shortString.encodeShortString(
        config.paradexChainId,
      ) as StarknetOld.RpcProviderOptions['chainId'],
    });
  }
}

export function getProvider(config: ParadexConfig) {
  if (config.paradexFullNodeRpcUrl.includes('v0_7')) {
    return new DefaultProvider(config)
  } else {
    return new DefaultProviderOld(config)
  }
}

export type ParaclearProvider = DefaultProviderOld;