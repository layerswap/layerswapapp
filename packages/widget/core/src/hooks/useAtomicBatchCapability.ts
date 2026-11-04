import useSWR from 'swr'
import type { Network, Token, Wallet } from '@layerswap/widget-types'
import { resolverService } from '@/lib/resolvers/resolverService'

/** The form discovers support early; review reads the same wallet/account/chain query. */
export function useAtomicBatchCapability(network: Network | undefined, token: Token | undefined, wallet: Wallet | undefined, account: string | undefined): boolean {
    const key = network && token && wallet?.isActive && account
        ? ['atomic-batch-capability', network.name, network.chain_id, wallet.id, wallet.internalId, wallet.providerName,
            wallet.metadata?.connectorId, wallet.metadata?.connectorUid, wallet.metadata?.evmConnectorUid,
            wallet.metadata?.walletConnectTopic, wallet.chainId, wallet.addresses?.join(','), account]
        : null
    const { data } = useSWR<boolean>(key, async () => {
        if (!network || !token || !wallet?.isActive || !account) return false
        // Resolver registration finishes before wallet discovery starts.
        await Promise.resolve()
        try {
            const source = { ...network, token }
            const provider = resolverService.getTransferResolver().getAtomicBatchProvider(source)
            return await provider?.getCapabilities({ network: source, wallet, account }) === 'supported'
        } catch {
            return false
        }
    }, {
        keepPreviousData: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    })
    return data === true
}
