import type { Network, Token, Wallet } from '@layerswap/widget-types'
import { getWalletCapabilities } from '@/helpers/walletCapabilities'

/** Reads the support the wallet reported when it connected; swap creation rechecks it. */
export function useAtomicBatchCapability(network: Network | undefined, token: Token | undefined, wallet: Wallet | undefined, account: string | undefined): boolean {
    if (!network || !token || !wallet?.isActive || !account) return false
    return getWalletCapabilities(wallet, account, network)?.atomic === 'supported'
}
