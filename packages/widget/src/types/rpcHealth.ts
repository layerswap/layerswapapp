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

export type RpcHealthCheckResult = {
  health: RpcHealth
  checkManually: () => Promise<void>
  suggestRpc: (params: AddEthereumChainParams) => Promise<SuggestRpcResult>
  suggestRpcForCurrentChain: (
    rpcUrl: string,
    chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>
  ) => Promise<SuggestRpcResult>
  isSuggestingRpc: boolean
}

export interface RpcHealthCheckProvider {
  supportsNetwork(network: Network): boolean
  useRpcHealthCheck(): RpcHealthCheckResult
}
