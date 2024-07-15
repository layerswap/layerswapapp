import * as Starknet from 'starknet';

import type { ParadexConfig } from './config';

export class DefaultProvider extends Starknet.RpcProvider {
  constructor(config: ParadexConfig) {
    super({
      nodeUrl: config.starknetFullNodeRpcUrl,
      chainId: config.starknetChainId as Starknet.RpcProviderOptions['chainId'],
    });
  }
}

export type ParaclearProvider = DefaultProvider;