import { capabilitiesForChain, type Network, type Wallet, type WalletCapabilities } from '@layerswap/widget-types'

/** Capabilities the wallet reported for this account and chain, falling back to its all-chains entry. */
export function getWalletCapabilities(wallet: Wallet | undefined, account: string | undefined, network: Network | undefined): WalletCapabilities | undefined {
    if (!wallet || !account || !network) return undefined
    return capabilitiesForChain(wallet.metadata?.capabilities?.[account.toLowerCase()], Number(network.chain_id))
}
