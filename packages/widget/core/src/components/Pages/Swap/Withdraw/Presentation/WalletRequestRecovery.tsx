import { useSyncExternalStore } from 'react'
import { walletRequestStore } from '@layerswap/wallet-core'
import type { Wallet } from '@layerswap/widget-types'

/** A second tap opens the already-published request; it never sends another one. */
export function WalletRequestRecovery({ wallet, active, afterSequence }: {
    wallet?: Wallet
    active: boolean
    afterSequence: number
}) {
    const request = useSyncExternalStore(walletRequestStore.subscribe, walletRequestStore.getSnapshot, walletRequestStore.getServerSnapshot)
    if (!active || !wallet || !request || request.sequence <= afterSequence) return null
    // Match the session, not the name: a wallet connected through the generic
    // WalletConnect connector is named after the connector, not the peer wallet,
    // and two wallet apps can share an account.
    if (!wallet.metadata?.walletConnectTopic || request.topic !== wallet.metadata.walletConnectTopic) return null
    const normalize = (address: string) => request.namespace === 'eip155' ? address.toLowerCase() : address
    if (!request.accounts.some(address => normalize(address) === normalize(wallet.address))) return null

    return <div className="text-center text-sm py-2">
        {request.href ? (
            <a className="underline underline-offset-4" href={request.href}>Open wallet</a>
        ) : (
            <p>Open {request.walletName} manually to review the pending request.</p>
        )}
    </div>
}
