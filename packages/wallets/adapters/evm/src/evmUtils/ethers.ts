import { getWalletClient } from '@wagmi/core'
import { providers } from 'ethers'
import type { WalletClient } from 'viem'
import { getEvmConfig, hasEvmConfig } from '../service/getEvmConfig'

export function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient

    if (!chain) throw new Error('Chain not found in public client')
    if (!account) throw new Error('Account not found in public client')

    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    }

    // Force disable type checking of transport
    // See https://github.com/wagmi-dev/viem/discussions/792#discussioncomment-6297530
    const provider = new providers.Web3Provider(transport, network)
    const signer = provider.getSigner(account.address)
    return signer
}

/**
 * Imperative replacement for `useEthersSigner`. Resolves to an ethers v5
 * Signer for the active EVM wallet on the requested chain, or `undefined`
 * if no wallet is connected.
 */
export async function getEthersSigner({ chainId }: { chainId?: number } = {}) {
    if (!hasEvmConfig()) return undefined
    try {
        const client = await getWalletClient(getEvmConfig(), { chainId })
        return client ? walletClientToSigner(client as WalletClient) : undefined
    } catch {
        return undefined
    }
}
