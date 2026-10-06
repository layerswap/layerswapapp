import { useEffect, useState } from 'react'
import type { Network, Token, Wallet } from '@layerswap/widget-types'
import { resolverService } from '@/lib/resolvers/resolverService'
import { supportsWebLocks } from '@/stores/atomicBatchStore'

export function useAtomicBatchCapability(network: Network | undefined, token: Token | undefined, wallet: Wallet | undefined, account: string | undefined) {
    const key = [network?.name, network?.chain_id, token?.contract, wallet?.id, wallet?.internalId, wallet?.providerName,
        wallet?.metadata?.connectorId, wallet?.metadata?.connectorUid, wallet?.chainId, account].join(':')
    const [capability, setCapability] = useState<{ key: string; supported: boolean }>()
    useEffect(() => {
        const controller = new AbortController()
        setCapability(undefined)
        if (supportsWebLocks() && network?.type === 'evm' && token?.contract && wallet && account) {
            const source = { ...network, token }
            // Resolver registration is a parent effect; discovery runs after it has settled.
            void Promise.resolve().then(() => {
                const provider = resolverService.getTransferResolver().getAtomicBatchProvider(source)
                return provider?.getCapabilities({ network: source, wallet, account, signal: controller.signal })
            }).then(status => { if (!controller.signal.aborted) setCapability({ key, supported: status === 'supported' }) }).catch(() => {})
        }
        return () => controller.abort()
    }, [key])
    return capability?.key === key && capability.supported
}
