import * as wagmi from 'wagmi';
import * as core from '@wagmi/core';
import * as viem from 'viem';
import * as query from '@tanstack/react-query';

/** Capability handshake: prove the remote consumes the host's actual modules. */
export default function walletRuntime() {
  return {
    wagmiCreateConfig: wagmi.createConfig,
    wagmiUseConfig: wagmi.useConfig,
    coreCreateConfig: core.createConfig,
    viemCreatePublicClient: viem.createPublicClient,
    queryClient: query.QueryClient,
  };
}
