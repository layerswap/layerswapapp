import type { Network, Wallet, WalletCapabilities } from '@layerswap/widget-types'

/** Capabilities the wallet reported for this account and chain, falling back to its all-chains entry. */
export function getWalletCapabilities(wallet: Wallet | undefined, account: string | undefined, network: Network | undefined): WalletCapabilities | undefined {
    if (!wallet || !account || !network) return undefined
    const chains = wallet.metadata?.capabilities?.[account.toLowerCase()]
    const chain = chains?.[Number(network.chain_id)]
    const global = chains?.[0]
    if (!chain && !global) return undefined
    return {
        atomic: chain?.atomic !== 'unsupported' && chain?.atomic ? chain.atomic : global?.atomic ?? 'unsupported',
        alternateGasFees: chain?.alternateGasFees || global?.alternateGasFees || false,
    }
}
