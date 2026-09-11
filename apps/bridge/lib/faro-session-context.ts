import { BaseInstrumentation, type Faro } from '@grafana/faro-web-sdk'

type SessionAPI = Pick<Faro['api'], 'getSession' | 'setSession'>
type Attributes = Record<string, string>

// Register before the SDK session instrumentation, not as a beforeSend filter:
// filters run on batches and must not rewrite historical event snapshots.
export class SwapContextInstrumentation extends BaseInstrumentation {
    readonly name = 'layerswap-swap-context'
    readonly version = '1.0.0'
    private readonly ready: (writer: ReturnType<typeof createSwapContextWriter>) => void
    constructor(ready: (writer: ReturnType<typeof createSwapContextWriter>) => void) {
        super()
        this.ready = ready
    }
    initialize() {
        this.ready(createSwapContextWriter(this.api, listener => this.metas.addListener(listener)))
    }
}

/** This page owns swap metadata; never adopt a persisted/other-tab swap. */
export function createSwapContextWriter(
    api: SessionAPI,
    listen: (listener: () => void) => void,
): (attributes: Attributes, replace?: boolean) => boolean {
    let latest: Attributes = {}
    let writing = false
    const sync = () => {
        if (writing) return false
        writing = true
        try { return updateSessionContext(api, 'swap', latest) }
        finally { writing = false }
    }
    listen(() => {
        try { sync() } catch { /* Telemetry must not fail session adoption. */ }
    })
    sync()
    return (attributes, replace = false) => {
        const differentSwap = attributes.swap_id && latest.swap_id && attributes.swap_id !== latest.swap_id
        if (replace || differentSwap) latest = {}
        for (const [key, value] of Object.entries(attributes)) {
            if (SWAP_CONTEXT_KEYS.has(key)) latest[key] = value
        }
        return sync()
    }
}
export const WALLET_CONTEXT_KEYS = new Set([
    'connected_wallets', 'connected_wallet_count', 'connected_wallets_omitted', 'connected_wallets_state',
])

/** Reapply this tab's last observed wallet state after SDK session adoption/rotation. */
export function createWalletContextWriter(
    api: SessionAPI,
    listen: (listener: () => void) => void,
): (attributes: Attributes) => boolean {
    let latest: Attributes | undefined
    let writing = false
    const sync = () => {
        if (!latest || writing) return false
        writing = true
        try { return updateSessionContext(api, 'wallet', latest) }
        finally { writing = false }
    }
    listen(() => {
        try { sync() } catch { /* Session changes must not fail with telemetry. */ }
    })
    return attributes => { latest = { ...attributes }; return sync() }
}

// Include historical/persisted keys, not just keys seen since this page loaded.
// Other owners (including Faro's isSampled/previousSession) must survive.
const SWAP_CONTEXT_KEYS = new Set([
    'schema_version', 'step', 'stage', 'outcome', 'path', 'swap_id', 'previous_swap_id',
    'reason_code', 'reason', 'action', 'provider', 'transaction_hash', 'input_transaction_hash',
    'output_transaction_hash', 'refund_transaction_hash', 'status', 'phase', 'deposit_method',
    'requested_amount', 'from_address', 'to_address', 'source_network', 'destination_network',
    'source_token', 'destination_token', 'confirmations', 'max_confirmations', 'journey_id',
    'sequence', 'attempt', 'previous_step', 'previous_outcome', 'previous_step_duration_ms',
    'journey_duration_ms', 'page_url', 'stalled_step', 'stall_threshold_ms',
])

export function updateSessionContext(
    api: SessionAPI,
    owner: 'swap' | 'wallet',
    incoming: Attributes,
    replace = true,
): boolean {
    const current = api.getSession()
    if (!current?.id) return false
    const owned = owner === 'wallet' ? WALLET_CONTEXT_KEYS : SWAP_CONTEXT_KEYS
    const attributes: Attributes = { ...current.attributes }
    if (replace) for (const key of owned) delete attributes[key]
    for (const [key, value] of Object.entries(incoming)) {
        // Explicit ownership prevents collisions and accidental provider dumps.
        if (owned.has(key)) attributes[key] = value
    }
    const previous = current.attributes ?? {}
    if (Object.keys(previous).length === Object.keys(attributes).length
        && Object.entries(attributes).every(([key, value]) => previous[key] === value)) return true
    api.setSession({ ...current, attributes })
    return true
}

/** A registry subscription shared by the React observer and its deterministic tests. */
export function observeWalletContext<T>(
    registry: { getEntries(): readonly { store: { getState(): T } }[]; subscribe(listener: () => void): () => void },
    publish: (snapshots: T[]) => void,
    clear: () => void,
): () => void {
    const update = () => {
        try { publish(registry.getEntries().map(entry => entry.store.getState())) }
        catch { /* Telemetry must not interrupt provider store notifications. */ }
    }
    const unsubscribe = registry.subscribe(update)
    update()
    return () => {
        unsubscribe()
        try { clear() } catch { /* No wallet details in fallback console logs. */ }
    }
}
