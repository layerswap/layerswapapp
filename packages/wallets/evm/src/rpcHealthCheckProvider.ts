import { useAccount } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import type { RpcHealth, RpcHealthCheckResult, RpcHealthCheckProvider, AddEthereumChainParams, SuggestRpcResult, Network } from '@layerswap/widget/types'
import { NetworkType } from '@layerswap/widget/types'

function useEVMRpcHealthCheckHook(): RpcHealthCheckResult {
  const { isConnected, connector, chainId } = useAccount()
  const [health, setHealth] = useState<RpcHealth>({ status: undefined })
  const [isSuggestingRpc, setIsSuggestingRpc] = useState(false)

  const check = useCallback(async () => {
    if (!connector || !isConnected) {
      return
    }

    try {

      const provider: any = await connector.getProvider()
      if (!provider || typeof provider.request !== 'function') {
        return
      }

      const start = performance.now()

      const [latestBlock] = await Promise.all([
        provider.request({
          method: 'eth_getBlockByNumber',
          params: ['latest', false],
        }),
      ])

      const latencyMs = performance.now() - start

      const tsHex = latestBlock?.timestamp
      const blockAgeSec =
        tsHex != null
          ? Date.now() / 1000 - parseInt(tsHex, 16)
          : Number.POSITIVE_INFINITY

      const tooSlow = latencyMs > 2000
      const tooStale = blockAgeSec > 60

      if (tooSlow || tooStale) {
        let reason = ''
        if (tooSlow) reason += `Wallet RPC is slow (${latencyMs.toFixed(0)}ms). `
        if (tooStale) reason += `Latest block is stale (${blockAgeSec.toFixed(0)}s old).`
        setHealth({ status: 'unhealthy', reason: reason.trim() })
        return
      }
      setHealth({ status: 'healthy', latencyMs, blockAgeSec })
    } catch (e: any) {
      const msg = e?.message || 'Unknown error from wallet RPC'
      setHealth({ status: 'unhealthy', reason: msg })
    }
  }, [connector, isConnected])

  const suggestRpc = useCallback(
    async (params: AddEthereumChainParams): Promise<SuggestRpcResult> => {
      if (!connector || !isConnected) {
        return { success: false, error: 'Wallet not connected' }
      }

      setIsSuggestingRpc(true)

      try {
        const provider: any = await connector.getProvider()
        if (!provider || typeof provider.request !== 'function') {
          return { success: false, error: 'No wallet provider available' }
        }

        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [params],
        })

        await check()

        return { success: true }
      } catch (e: any) {
        // User rejected or wallet doesn't support this method
        const error = e?.message || 'Failed to update wallet RPC'
        return { success: false, error }
      } finally {
        setIsSuggestingRpc(false)
      }
    },
    [connector, isConnected, check]
  )

  const suggestRpcForCurrentChain = useCallback(
    async (
      rpcUrl: string,
      chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>
    ): Promise<SuggestRpcResult> => {
      if (!chainId) {
        return { success: false, error: 'No chain connected' }
      }

      return suggestRpc({
        chainId: `0x${chainId.toString(16)}`,
        rpcUrls: [rpcUrl],
        ...chainDetails,
      })
    },
    [chainId, suggestRpc]
  )

  useEffect(() => {
    if (connector && isConnected) {
      check()
    }
  }, [connector, isConnected, check])

  return {
    health,
    checkManually: check,
    suggestRpc,
    suggestRpcForCurrentChain,
    isSuggestingRpc,
  }
}

export class EVMRpcHealthCheckProvider implements RpcHealthCheckProvider {
  supportsNetwork(network: Network): boolean {
    return network.type === NetworkType.EVM
  }

  useRpcHealthCheck(): RpcHealthCheckResult {
    return useEVMRpcHealthCheckHook()
  }
}
