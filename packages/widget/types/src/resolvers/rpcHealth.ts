import { Network } from "../types"

/**
 * `chainId` is the chain the verdict was measured on. Providers that probe the wallet's
 * active chain must set it, so a verdict for another chain is never shown for the
 * network being asked about.
 */
export type RpcHealth =
  | { status: undefined }
  | { status: 'healthy'; latencyMs: number; blockAgeSec: number; chainId?: string | number }
  | { status: 'unhealthy'; reason: string; chainId?: string | number }

export type AddEthereumChainParams = {
  chainId: string
  chainName: string
  rpcUrls: string[]
  nativeCurrency: {
    name: string | undefined
    symbol: string | undefined
    decimals: number | undefined
  }
  blockExplorerUrls?: string[]
}

export type SuggestRpcResult =
  | { success: true }
  | { success: false; error: string; errorCode?: string }

export type RpcHealthCheckSnapshot = {
  health: RpcHealth
  isSuggestingRpc: boolean
}

/**
 * Shape returned by the `useRpcHealth` widget hook. Combines the live
 * snapshot with the imperative ops exposed by the underlying store.
 * `health` and `suggestRpcForCurrentChain` are scoped to the network passed
 * to the hook, not to whichever chain the wallet is on.
 */
export type RpcHealthCheckResult = RpcHealthCheckSnapshot & {
  checkManually: () => Promise<void>
  suggestRpc: (params: AddEthereumChainParams) => Promise<SuggestRpcResult>
  suggestRpcForCurrentChain: (
    rpcUrl: string,
    chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>
  ) => Promise<SuggestRpcResult>
}

/**
 * External-store contract for RPC health checks. Replaces the previous
 * `useRpcHealthCheck` hook. The widget consumes via `useSyncExternalStore`.
 */
export type RpcHealthCheckStore = {
  subscribe(listener: () => void): () => void
  getSnapshot(): RpcHealthCheckSnapshot
  checkManually(): Promise<void>
  suggestRpc(params: AddEthereumChainParams): Promise<SuggestRpcResult>
  suggestRpcForCurrentChain(
    rpcUrl: string,
    chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>
  ): Promise<SuggestRpcResult>
  destroy?(): void
}

export interface RpcHealthCheckProvider {
  supportsNetwork(network: Network): boolean
  /** Lazy-create (and cache) the store. Multiple calls should return the same instance. */
  createStore(): RpcHealthCheckStore
}
