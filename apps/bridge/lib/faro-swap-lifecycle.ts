import {
    SWAP_LIFECYCLE_ATTEMPT_START_STEPS, SWAP_LIFECYCLE_PHASE_STEPS, createRandomId,
    type SwapLifecycleEvent, type SwapLifecycleStep,
} from '@layerswap/widget-types'

const PHASE_OBSERVATION_STEPS = new Set(SWAP_LIFECYCLE_PHASE_STEPS)
/** Bounds per-swap state for long sessions that revisit many swaps. */
const MAX_TRACKED_SWAPS = 64

function getLifecycleAttributes(event: SwapLifecycleEvent): Record<string, unknown> {
    return {
        schema_version: 1,
        step: event.step,
        stage: event.stage,
        outcome: event.outcome,
        path: event.path,
        swap_id: event.swapId,
        reason_code: event.reasonCode,
        reason: event.reason,
        error_code: event.errorCode,
        occurrence_id: event.occurrenceId,
        action: event.action,
        provider: event.provider,
        transaction_hash: event.transactionHash,
        input_transaction_hash: event.inputTransactionHash,
        output_transaction_hash: event.outputTransactionHash,
        refund_transaction_hash: event.refundTransactionHash,
        status: event.status,
        phase: event.phase,
        deposit_method: event.depositMethod,
        requested_amount: event.requestedAmount,
        from_address: event.fromAddress,
        to_address: event.toAddress,
        source_network: event.sourceNetwork,
        destination_network: event.destinationNetwork,
        source_token: event.sourceToken,
        destination_token: event.destinationToken,
        confirmations: event.confirmations,
        max_confirmations: event.maxConfirmations,
    }
}

type LifecycleState = {
    journeyId: string
    startedAt: number
    lastEventAt: number
    lastStep?: SwapLifecycleStep
    lastOutcome?: SwapLifecycleEvent['outcome']
    lastFingerprintByStep: Map<SwapLifecycleStep | 'phase', string>
    sequence: number
    attempt: number
    operationSequence: number
    swapId?: string
    terminal: boolean
    departed?: boolean
    stallTimer?: ReturnType<typeof setTimeout>
}

const REPEATABLE_LIFECYCLE_STEPS = new Set<SwapLifecycleStep>([
    ...SWAP_LIFECYCLE_ATTEMPT_START_STEPS,
    'form_submitted',
    // The widget emits one record per reason transition; a later re-block
    // after recovery is a distinct observation.
    'transfer_blocked',
])

const TERMINAL_LIFECYCLE_STEPS = new Set<SwapLifecycleStep>([
    'swap_completed',
    'swap_failed',
    'swap_expired',
    'swap_cancelled',
    'refund_completed',
    'flow_closed',
])

// These are deliberately conservative. A stall is a diagnostic signal, not a
// terminal failure: the swap can still advance and emit later lifecycle rows.
const STALL_THRESHOLDS_MS: Partial<Record<SwapLifecycleStep, number>> = {
    swap_creation_started: 60_000,
    wallet_connection_started: 120_000,
    wallet_connected: 120_000,
    network_switch_started: 120_000,
    network_switched: 120_000,
    awaiting_wallet_action: 10 * 60_000,
    wallet_prompt_opened: 120_000,
    awaiting_user_deposit: 30 * 60_000,
    deposit_address_copied: 30 * 60_000,
    retry_requested: 60_000,
    transfer_blocked: 10 * 60_000,
    transaction_submitted: 15 * 60_000,
    gasless_authorization_submitted: 15 * 60_000,
    input_transaction_detected: 15 * 60_000,
    input_transfer_pending: 15 * 60_000,
    input_transfer_confirmed: 10 * 60_000,
    output_transfer_pending: 30 * 60_000,
    output_transaction_detected: 10 * 60_000,
    output_settling: 30 * 60_000,
    refund_pending: 60 * 60_000,
}

export function createJourneyId(): string {
    return createRandomId()
}

function createLifecycleState(now: number): LifecycleState {
    return {
        journeyId: createJourneyId(),
        startedAt: now,
        lastEventAt: now,
        sequence: 0,
        attempt: 0,
        operationSequence: 0,
        terminal: false,
        lastFingerprintByStep: new Map(),
    }
}

export function createSwapLifecycleTelemetry({ captureEvent, setSwapContext }: {
    captureEvent: (name: string, attributes: Record<string, unknown>) => boolean
    setSwapContext: (attributes: Record<string, unknown>, options?: { replaceAttributes?: boolean }) => boolean
}) {
    const lifecycleBySwapRef = { current: new Map<string, LifecycleState>() }
    const activeLifecycleRef: { current: LifecycleState | undefined } = { current: undefined }
    let disposed = false
    let entryGeneration = 0
    // Explicit UI entry (openFlow) is the only way an unknown swap may replace a
    // closed or finished journey; otherwise late updates stay in the background.
    let entryPending = false
    const depart = (state: LifecycleState | undefined) => {
        if (!state) return
        state.departed = true
        if (state.stallTimer) clearTimeout(state.stallTimer)
        state.stallTimer = undefined
    }
    const activate = (state: LifecycleState) => {
        entryPending = false
        if (activeLifecycleRef.current !== state) {
            entryGeneration += 1
            depart(activeLifecycleRef.current)
            activeLifecycleRef.current = state
        }
    }
    const track = (swapId: string, state: LifecycleState) => {
        const tracked = lifecycleBySwapRef.current
        tracked.set(swapId, state)
        // Every tracked journey was active when inserted and only the active
        // one can still own timers or context, so evicting an older entry just
        // forgets its journey id for late background updates.
        for (const [key, oldest] of tracked) {
            if (tracked.size <= MAX_TRACKED_SWAPS) break
            if (oldest === activeLifecycleRef.current) continue
            tracked.delete(key)
        }
    }

    const record = (event: SwapLifecycleEvent) => {
        if (disposed) return
        if (event.step === 'flow_error') {
            const active = activeLifecycleRef.current
            const known = event.swapId ? lifecycleBySwapRef.current.get(event.swapId) : active
            captureEvent('swap_lifecycle', {
                ...getLifecycleAttributes(event), diagnostic: true,
                journey_id: known && !known.departed ? known.journeyId : undefined,
                swap_id: event.swapId ?? (known && !known.departed ? known.swapId : undefined),
            })
            return
        }
        const now = Date.now()
        let state: LifecycleState
        let previousSwapId: string | undefined

        if (event.step === 'form_submitted') {
            state = createLifecycleState(now)
            activate(state)
        }
        else if (event.swapId) {
            const knownState = lifecycleBySwapRef.current.get(event.swapId)
            if (knownState) {
                state = knownState
            }
            else {
                const activeState = activeLifecycleRef.current
                const continuesActiveJourney = activeState && !activeState.terminal && !activeState.departed && (
                    !activeState.swapId
                    || activeState.swapId === event.swapId
                    || event.step === 'swap_created'
                )
                if (continuesActiveJourney) {
                    state = activeState
                    if (state.swapId && state.swapId !== event.swapId) {
                        previousSwapId = state.swapId
                    }
                    state.swapId = event.swapId
                    activate(state)
                }
                else {
                    state = createLifecycleState(now)
                    state.swapId = event.swapId
                    // Without a creation step, explicit flow entry or a fresh
                    // tracker, a different swap reporting here (an evicted or
                    // never-tracked one) is a background update. It keeps its
                    // own journey id but must not take over session context or
                    // stall tracking from a live, finished or closed journey.
                    const explicitStart = event.step === 'swap_created' || !activeState || entryPending
                    if (explicitStart) activate(state)
                    else state.departed = true
                }
                track(event.swapId, state)
            }
        }
        else {
            const activeState = activeLifecycleRef.current
            state = activeState && !activeState.departed
                ? activeState
                : createLifecycleState(now)
            activate(state)
        }

        const attributes = getLifecycleAttributes(event)
        // A -> B -> A is a real recovery, while replaying A alone is a duplicate.
        const observationKey = PHASE_OBSERVATION_STEPS.has(event.step) ? 'phase' : event.step
        const fingerprint = JSON.stringify([
            state.operationSequence,
            event.occurrenceId,
            event.step,
            event.swapId,
            event.outcome,
            event.reasonCode,
            event.transactionHash,
            event.inputTransactionHash,
            event.outputTransactionHash,
            event.refundTransactionHash,
            event.status,
            event.phase,
        ])
        if (
            state.lastFingerprintByStep.get(observationKey) === fingerprint
            && !REPEATABLE_LIFECYCLE_STEPS.has(event.step)
        ) return

        if (state.stallTimer) {
            clearTimeout(state.stallTimer)
            state.stallTimer = undefined
        }

        if (event.step === 'wallet_prompt_opened') state.attempt += 1
        if (['swap_creation_started', 'wallet_connection_started', 'network_switch_started', 'wallet_prompt_opened'].includes(event.step)) {
            state.operationSequence += 1
        }

        const sequence = state.sequence + 1
        const enrichedAttributes = {
            ...attributes,
            swap_id: event.swapId ?? state.swapId ?? '',
            previous_swap_id: previousSwapId,
            journey_id: state.journeyId,
            sequence,
            attempt: state.attempt,
            previous_step: state.lastStep,
            previous_outcome: state.lastOutcome,
            previous_step_duration_ms: state.sequence ? now - state.lastEventAt : 0,
            journey_duration_ms: now - state.startedAt,
            page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        }

        // A lifecycle transition replaces the previous transition context so
        // stale reasons/hashes do not leak into unrelated later console logs.
        const ownsContext = activeLifecycleRef.current === state && !state.departed
        const contextApplied = !ownsContext || setSwapContext(enrichedAttributes, { replaceAttributes: true })
        // The writer re-syncs once a session exists, so emission continues; the
        // row itself records that surrounding signals may lack swap context.
        const accepted = captureEvent('swap_lifecycle', contextApplied
            ? enrichedAttributes
            : { ...enrichedAttributes, context_write_failed: true })
        if (event.step === 'flow_closed') {
            depart(state)
            if (ownsContext) setSwapContext({}, { replaceAttributes: true })
        }
        if (!accepted) return

        state.sequence = sequence
        state.lastEventAt = now
        state.lastStep = event.step
        state.lastOutcome = event.outcome
        state.lastFingerprintByStep.set(observationKey, fingerprint)
        state.terminal = TERMINAL_LIFECYCLE_STEPS.has(event.step)

        const stallThreshold = STALL_THRESHOLDS_MS[event.step]
        if (!stallThreshold || state.terminal || !ownsContext || state.departed) return

        const sequenceAtSchedule = state.sequence
        state.stallTimer = setTimeout(() => {
            if (disposed || state.departed || activeLifecycleRef.current !== state
                || state.terminal || state.sequence !== sequenceAtSchedule) return

            const stalledAt = Date.now()
            const stalledSequence = state.sequence + 1
            const stalledAttributes = {
                ...attributes,
                step: 'suspected_stall',
                outcome: 'stalled',
                reason_code: `${event.step}_timeout`,
                stalled_step: event.step,
                stall_threshold_ms: stallThreshold,
                swap_id: event.swapId ?? state.swapId ?? '',
                journey_id: state.journeyId,
                sequence: stalledSequence,
                attempt: state.attempt,
                previous_step: event.step,
                previous_outcome: event.outcome,
                previous_step_duration_ms: stalledAt - state.lastEventAt,
                journey_duration_ms: stalledAt - state.startedAt,
                page_url: typeof window !== 'undefined' ? window.location.href : undefined,
            }
            const contextApplied = setSwapContext(stalledAttributes, { replaceAttributes: true })
            const accepted = captureEvent('swap_lifecycle', contextApplied
                ? stalledAttributes
                : { ...stalledAttributes, context_write_failed: true })
            if (accepted) state.sequence = stalledSequence
            state.stallTimer = undefined
        }, stallThreshold)
    }

    return {
        record,
        setLegacyContext(attributes: Record<string, unknown>) {
            if (disposed) return
            const swapId = typeof attributes.swap_id === 'string' ? attributes.swap_id : undefined
            const known = swapId ? lifecycleBySwapRef.current.get(swapId) : undefined
            if (known?.departed || activeLifecycleRef.current?.departed) return
            if (known && known !== activeLifecycleRef.current) return
            if (swapId && !known) {
                let state = activeLifecycleRef.current
                if (!state || (state.swapId && state.swapId !== swapId)) {
                    state = createLifecycleState(Date.now())
                    activate(state)
                }
                state.swapId = swapId
                track(swapId, state)
            }
            setSwapContext(attributes)
        },
        closeFlow() {
            const state = activeLifecycleRef.current
            const generation = entryGeneration
            // The widget calls onSwapModalStateChange(false) before its
            // synchronous flow_closed event. Preserve that event's metadata,
            // but also clear pre-creation flows that emit no closing event.
            queueMicrotask(() => {
                if (disposed || generation !== entryGeneration || activeLifecycleRef.current !== state) return
                depart(state)
                setSwapContext({}, { replaceAttributes: true })
            })
        },
        openFlow() {
            entryGeneration += 1
            entryPending = true
            // Explicit UI entry distinguishes reopening a known swap from a late
            // background update for a closed one. The next event owns a new journey.
            if (activeLifecycleRef.current?.departed) {
                lifecycleBySwapRef.current.clear()
                activeLifecycleRef.current = undefined
            }
        },
        resume() { disposed = false },
        dispose() {
            disposed = true
            depart(activeLifecycleRef.current)
            lifecycleBySwapRef.current.forEach(depart)
            lifecycleBySwapRef.current.clear()
            activeLifecycleRef.current = undefined
            setSwapContext({}, { replaceAttributes: true })
        },
    }
}
