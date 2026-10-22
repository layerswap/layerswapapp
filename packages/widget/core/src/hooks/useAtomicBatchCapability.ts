import { useEffect, useState } from 'react'
import type { Network, Token, Wallet } from '@layerswap/widget-types'
import { resolverService } from '@/lib/resolvers/resolverService'

/** Read-only discovery for an eligible draft. The adapter shares its cache with creation. */
export function useAtomicBatchCapability(network: Network | undefined, token: Token | undefined, wallet: Wallet | undefined, account: string | undefined) {
    const key = [network?.name, network?.chain_id, token?.contract, wallet?.id, wallet?.internalId,
        wallet?.metadata?.evmConnectorUid, wallet?.metadata?.walletConnectTopic, wallet?.chainId, wallet?.isActive, account].join(':')
    const [capability, setCapability] = useState<{ key: string; supported: boolean }>()
    useEffect(() => {
        if (!network || !token || !wallet?.isActive || !account) return
        const controller = new AbortController()
        const source = { ...network, token }
        // Provider registration finishes before discovery starts.
        void Promise.resolve().then(() => {
            controller.signal.throwIfAborted()
            const provider = resolverService.getTransferResolver().getAtomicBatchProvider(source)
            return provider?.getCapabilities({ network: source, wallet, account, signal: controller.signal })
        }).then(status => {
            if (!controller.signal.aborted) setCapability({ key, supported: status === 'supported' })
        }).catch(() => {
            if (!controller.signal.aborted) setCapability({ key, supported: false })
        })
        return () => controller.abort()
    }, [key])
    return capability?.key === key && capability.supported
}
