import { Network } from "@/Models/Network"

export type RpcHealth =
  | { status: undefined }
  | { status: 'healthy'; latencyMs: number; blockAgeSec: number }
  | { status: 'unhealthy'; reason: string }

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
  | { success: false; error: string }

export type RpcHealthCheckSnapshot = {
  health: RpcHealth
  isSuggestingRpc: boolean
}

/**
 * Shape returned by the `useRpcHealth` widget hook. Combines the live
 * snapshot with the imperative ops exposed by the underlying store.
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
 *
 * Stores are shared singletons (see `createStore` below), so any upstream
 * resources must be managed inside `subscribe` — acquired when the first
 * listener subscribes, released when the last one unsubscribes — never via a
 * per-consumer teardown method, which one consumer could use to kill the
 * store for everyone else.
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
}

export interface RpcHealthCheckProvider {
  supportsNetwork(network: Network): boolean
  /** Lazy-create (and cache) the store. Multiple calls should return the same instance. */
  createStore(): RpcHealthCheckStore
}
