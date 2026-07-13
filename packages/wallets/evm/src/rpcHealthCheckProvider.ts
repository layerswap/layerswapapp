import { useAccount } from 'wagmi'
import { useCallback, useEffect, useState } from 'react'
import type { RpcHealth, RpcHealthCheckResult, RpcHealthCheckProvider, AddEthereumChainParams, SuggestRpcResult, Network } from '@layerswap/widget/types'
import { NetworkType } from '@layerswap/widget/types'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>
}

const RPC_PROBE_TIMEOUT_MS = 8000

// Wallet in-app browsers (Rainbow, MetaMask mobile, etc.) and some WalletConnect
// sessions don't proxy arbitrary read methods like `eth_getBlockByNumber`; they
// reject with an "unsupported method" / "unauthorized" error that says nothing
// about RPC health. Treating those as unhealthy would show the (non-actionable)
// "add RPC" prompt inside wallet browsers even when the RPC is perfectly fine.
const UNSUPPORTED_METHOD_CODES = [
  4200, // EIP-1193: Unsupported Method
  4100, // EIP-1193: Unauthorized
  -32601, // JSON-RPC: Method not found
  -32004, // JSON-RPC: Method not supported
]
const UNSUPPORTED_METHOD_MESSAGES = [
  'not supported',
  'method not found',
  'unsupported method',
  'unauthorized',
  'does not exist',
  'not available',
]

function isMethodUnsupportedError(e: any): boolean {
  if (UNSUPPORTED_METHOD_CODES.includes(e?.code)) return true
  const msg = String(e?.message ?? '').toLowerCase()
  return UNSUPPORTED_METHOD_MESSAGES.some((m) => msg.includes(m))
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function resolveProvider(
  connector: NonNullable<ReturnType<typeof useAccount>['connector']>
): Promise<Eip1193Provider | null> {
  const provider = (await connector.getProvider()) as Partial<Eip1193Provider> | null
  return provider && typeof provider.request === 'function'
    ? (provider as Eip1193Provider)
    : null
}

function useEVMRpcHealthCheckHook(): RpcHealthCheckResult {
  const { isConnected, connector, chainId } = useAccount()
  const [health, setHealth] = useState<RpcHealth>({ status: undefined })
  const [isSuggestingRpc, setIsSuggestingRpc] = useState(false)

  const check = useCallback(async () => {
    if (!connector || !isConnected) return

    try {
      const provider = await resolveProvider(connector)
      if (!provider) return

      const start = performance.now()
      const latestBlock = await withTimeout(
        provider.request({ method: 'eth_getBlockByNumber', params: ['latest', false] }),
        RPC_PROBE_TIMEOUT_MS,
        'Wallet RPC timed out'
      )
      const latencyMs = performance.now() - start

      const tsHex = latestBlock?.timestamp
      const blockAgeSec =
        tsHex != null ? Date.now() / 1000 - parseInt(tsHex, 16) : Number.POSITIVE_INFINITY

      setHealth({ status: 'healthy', latencyMs, blockAgeSec })
    } catch (e: any) {
      // A wallet declining to serve the read method isn't an RPC health signal —
      // leave status "unknown" so we don't prompt the user to add an RPC.
      if (isMethodUnsupportedError(e)) {
        setHealth({ status: undefined })
        return
      }
      setHealth({ status: 'unhealthy', reason: e?.message || 'Unknown error from wallet RPC' })
    }
  }, [connector, isConnected])

  const suggestRpc = useCallback(
    async (params: AddEthereumChainParams): Promise<SuggestRpcResult> => {
      if (!connector || !isConnected) {
        return { success: false, error: 'Wallet not connected' }
      }

      setIsSuggestingRpc(true)
      try {
        const provider = await resolveProvider(connector)
        if (!provider) {
          return { success: false, error: 'No wallet provider available' }
        }

        await provider.request({ method: 'wallet_addEthereumChain', params: [params] })
        await check()

        return { success: true }
      } catch (e: any) {
        // User rejected or wallet doesn't support this method
        return { success: false, error: e?.message || 'Failed to update wallet RPC' }
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
    if (connector && isConnected) check()
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
