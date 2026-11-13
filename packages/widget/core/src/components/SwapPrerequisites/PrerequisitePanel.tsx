import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { swapPrerequisiteKey, type ResolvedSwapPrerequisite } from '@layerswap/wallet-core'
import type { SwapPrerequisiteContext, TransferProgress } from '@layerswap/widget-types'
import SubmitButton from '../Buttons/submitButton'
import { useConnectModal } from '../Wallet/WalletModal'
import useWallet from '../../hooks/useWallet'
import { Address } from '../../lib/address/Address'
import { useBalanceStore } from '../../stores/balanceStore'
import { useSettingsState } from '../../context/settings'
import { useSelectSwapAccount } from '../../context/swapAccounts'
import type { useSwapPrerequisites } from '../../hooks/useSwapPrerequisites'

type State = ReturnType<typeof useSwapPrerequisites>

export function PrerequisitePanel({ state, inline = false }: { state: State; inline?: boolean }) {
    if (!state.context || !state.applicable) return null
    // Receiving quotes invalidate readiness, but do not change the account setup action.
    const actionIdentity = swapPrerequisiteKey({ ...state.context, receiveAmount: undefined })
    return <PrerequisiteEntries key={actionIdentity} state={{ ...state, context: state.context }} inline={inline} />
}

function PrerequisiteEntries({ state, inline }: { state: State & { context: SwapPrerequisiteContext }; inline: boolean }) {
    const [previousEntries, setPreviousEntries] = useState(state.entries)
    useEffect(() => {
        if (state.entries) setPreviousEntries(state.entries)
    }, [state.entries])

    // Keep active cards mounted while the new quote is being checked. The keyed parent
    // resets them (and cancels pending actions) when the user changes the transfer inputs.
    const entries = state.entries ?? previousEntries
    if (!entries) return <div role="status" className={`flex items-center gap-2 text-sm text-secondary-text ${inline ? 'border-t border-secondary-300 pt-4' : 'rounded-xl bg-secondary-500 p-4'}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking account setup…</span>
    </div>
    const visibleEntries = entries.filter(entry => entry.result.status !== 'ready' || entry.result.title || entry.result.description)
    if (!visibleEntries.length) return null
    return <div className="space-y-3">
        {visibleEntries.map(entry => <PrerequisiteCard key={entry.provider.id} entry={entry} context={state.context} refresh={state.refresh} isChecking={state.isChecking} inline={inline} />)}
    </div>
}

function PrerequisiteCard({ entry, context, refresh, isChecking, inline }: {
    entry: ResolvedSwapPrerequisite
    context: SwapPrerequisiteContext
    refresh: State['refresh']
    isChecking: boolean
    inline: boolean
}) {
    const { result, provider: prerequisite } = entry
    const { action } = result
    const { provider, wallets } = useWallet(action?.wallet.network, action?.wallet.role === 'source' ? 'withdrawal' : 'autofill')
    const { provider: destinationProvider } = useWallet(context.destination.network, 'autofill')
    const matchingWallet = action && wallets.find(wallet => wallet.addresses.some(address => Address.equals(address, action.wallet.address, action.wallet.network)))
    const { connect, cancel } = useConnectModal()
    const { networks } = useSettingsState()
    const selectDestinationAccount = useSelectSwapAccount('to')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string>()
    const [progress, setProgress] = useState<TransferProgress>()
    const pending = useRef<AbortController | undefined>(undefined)
    const connecting = useRef(false)
    const refreshRef = useRef(refresh)
    useEffect(() => { refreshRef.current = refresh }, [refresh])
    useEffect(() => () => {
        pending.current?.abort()
        if (connecting.current) cancel()
    }, [cancel])

    const run = async () => {
        if (!action || pending.current || isChecking) return
        const controller = new AbortController()
        pending.current = controller
        setBusy(true)
        setError(undefined)
        try {
            if (!matchingWallet) {
                if (!provider) throw new Error('Connect the required account in a supported wallet, or complete setup externally and check again.')
                if (destinationProvider) selectDestinationAccount({ id: 'manually_added', providerName: destinationProvider.name, address: context.destination.address })
                connecting.current = true
                let connected
                try {
                    connected = await connect(provider)
                } finally {
                    connecting.current = false
                }
                controller.signal.throwIfAborted()
                if (connected && !connected.addresses.some(address => Address.equals(address, action.wallet.address, action.wallet.network))) {
                    throw new Error('Connect the wallet that owns the destination account to complete setup.')
                }
                return // Connecting never also initiates a signature.
            }
            if (!prerequisite.execute) throw new Error('Complete setup in your wallet, then check again.')
            await prerequisite.execute(context, action.id, {
                wallet: { ...matchingWallet, address: action.wallet.address },
                signal: controller.signal,
                onProgress: info => { if (!controller.signal.aborted) setProgress(info) },
            })
            // Setup can consume the same account's source balance as well as its reserve.
            const network = networks.find(network => network.name === action.wallet.network.name)
            if (network) await useBalanceStore.getState().fetchBalance(action.wallet.address, network, { ignoreCache: true }).catch(() => undefined)
            // An approval can outlive a quote update; refresh the currently displayed quote.
            await refreshRef.current()
        } catch (error) {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : String(error))
        } finally {
            if (!controller.signal.aborted) {
                pending.current = undefined
                setBusy(false)
                setProgress(undefined)
            }
        }
    }

    return <section className={`space-y-3 ${inline ? 'border-t border-secondary-300 pt-4' : 'rounded-xl bg-secondary-500 p-4'}`} aria-busy={busy || isChecking}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div aria-live="polite" className="min-w-0 flex-1 space-y-1">
                {result.title && <p className="font-medium leading-5 text-primary-text">{progress?.title ?? result.title}</p>}
                {result.description && <p className="text-sm leading-5 text-secondary-text">{progress?.description ?? result.description}</p>}
            </div>
            {action && <SubmitButton type="button" size="small" className="sm:w-auto sm:shrink-0" isSubmitting={busy} hideTextWhileSubmitting isDisabled={busy || isChecking} onClick={run}>
                {matchingWallet ? action.label : `Connect ${action.wallet.network.display_name} wallet`}
            </SubmitButton>}
        </div>
        {error && <p role="alert" className="text-sm text-secondary-text">{error}</p>}
        {result.status === 'unavailable' && <button type="button" disabled={busy || isChecking} onClick={() => refresh()} className="flex items-center gap-2 rounded-sm text-sm text-secondary-text underline underline-offset-4 hover:text-primary-text disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500">
            {isChecking && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Check again</span>
        </button>}
    </section>
}
