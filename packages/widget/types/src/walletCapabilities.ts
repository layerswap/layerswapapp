import type { ChainCapabilities, WalletCapabilities } from './wallet';

/** A chain's entry, falling back to the wallet's all-chains (0) entry per capability. */
export function capabilitiesForChain(chains: ChainCapabilities | undefined, chainId: number): WalletCapabilities | undefined {
  const chain = chains?.[chainId];
  const global = chains?.[0];
  if (!chain && !global) return undefined;
  return {
    atomic: chain?.atomic !== 'unsupported' && chain?.atomic ? chain.atomic : global?.atomic ?? 'unsupported',
    alternateGasFees: chain?.alternateGasFees || global?.alternateGasFees || false,
  };
}
