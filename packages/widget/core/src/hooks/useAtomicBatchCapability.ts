import useSWR from 'swr'
import { NetworkType, type Network, type Wallet } from '@layerswap/widget-types'
import { resolverService } from '@/lib/resolvers/resolverService'

export async function getAtomicBatchCapability(network: Network, wallet: Wallet) {
    try {
        return await resolverService.getTransferResolver().getAtomicBatchProvider(network)
            ?.getCapabilities({ network, selectedWallet: wallet }) ?? 'unsupported'
    } catch {
        return 'unsupported'
    }
}

export function useAtomicBatchCapability(network: Network | undefined, wallet: Wallet | undefined, enabled: boolean) {
    const key = enabled && network?.type === NetworkType.EVM && wallet?.isActive
        ? ['atomic-capability', wallet.providerName, wallet.id, wallet.internalId,
            wallet.metadata?.evmConnectorUid, wallet.address, network.chain_id, wallet.chainId] : null
    return useSWR(key, () => getAtomicBatchCapability(network!, wallet!), {
        keepPreviousData: false, revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 2000,
    })
}
