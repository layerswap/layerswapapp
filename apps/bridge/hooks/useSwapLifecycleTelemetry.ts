import { type SwapLifecycleEvent, type SwapLifecycleStep } from '@layerswap/widget-types'
import { useCallback, useEffect, useRef } from 'react'
import { captureEvent, setSwapContext } from '../lib/faro'

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
    lastFingerprintByStep: Map<SwapLifecycleStep, string>
    sequence: number
    attempt: number
    swapId?: string
    terminal: boolean
    stallTimer?: ReturnType<typeof setTimeout>
}

const REPEATABLE_LIFECYCLE_STEPS = new Set<SwapLifecycleStep>([
    'form_submitted',
    'swap_creation_started',
    'wallet_connection_started',
    'network_switch_started',
    'wallet_prompt_opened',
    'retry_requested',
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

function createJourneyId(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function createLifecycleState(now: number): LifecycleState {
    return {
        journeyId: createJourneyId(),
        startedAt: now,
        lastEventAt: now,
        sequence: 0,
        attempt: 0,
        terminal: false,
        lastFingerprintByStep: new Map(),
    }
}

export function useSwapLifecycleTelemetry(): (event: SwapLifecycleEvent) => void {
    const lifecycleBySwapRef = useRef(new Map<string, LifecycleState>())
    const activeLifecycleRef = useRef<LifecycleState | undefined>(undefined)

    useEffect(() => () => {
        const states = new Set(lifecycleBySwapRef.current.values())
        if (activeLifecycleRef.current) states.add(activeLifecycleRef.current)
        states.forEach(state => {
            if (state.stallTimer) clearTimeout(state.stallTimer)
        })
    }, [])

    return useCallback((event: SwapLifecycleEvent) => {
        const now = Date.now()
        let state: LifecycleState
        let previousSwapId: string | undefined

        if (event.step === 'form_submitted') {
            if (activeLifecycleRef.current?.stallTimer) {
                clearTimeout(activeLifecycleRef.current.stallTimer)
            }
            state = createLifecycleState(now)
            activeLifecycleRef.current = state
        }
        else if (event.swapId) {
            const knownState = lifecycleBySwapRef.current.get(event.swapId)
            if (knownState) {
                state = knownState
            }
            else {
                const activeState = activeLifecycleRef.current
                const continuesActiveJourney = activeState
                    && !activeState.terminal
                    && (
                        !activeState.swapId
                        || activeState.swapId === event.swapId
                        || event.step === 'swap_created'
                    )
                state = continuesActiveJourney
                    ? activeState
                    : createLifecycleState(now)
                if (state.swapId && state.swapId !== event.swapId) {
                    previousSwapId = state.swapId
                }
                state.swapId = event.swapId
                lifecycleBySwapRef.current.set(event.swapId, state)
                activeLifecycleRef.current = state
            }
        }
        else {
            const activeState = activeLifecycleRef.current
            state = activeState && !activeState.terminal
                ? activeState
                : createLifecycleState(now)
            activeLifecycleRef.current = state
        }

        const attributes = getLifecycleAttributes(event)
        const fingerprint = JSON.stringify([
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
            state.lastFingerprintByStep.get(event.step) === fingerprint
            && !REPEATABLE_LIFECYCLE_STEPS.has(event.step)
        ) return

        if (state.stallTimer) {
            clearTimeout(state.stallTimer)
            state.stallTimer = undefined
        }

        if (event.step === 'wallet_prompt_opened') state.attempt += 1

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
        setSwapContext(enrichedAttributes, { replaceAttributes: true })
        if (!captureEvent('swap_lifecycle', enrichedAttributes)) return

        state.sequence = sequence
        state.lastEventAt = now
        state.lastStep = event.step
        state.lastOutcome = event.outcome
        state.lastFingerprintByStep.set(event.step, fingerprint)
        state.terminal = TERMINAL_LIFECYCLE_STEPS.has(event.step)

        const stallThreshold = STALL_THRESHOLDS_MS[event.step]
        if (!stallThreshold || state.terminal) return

        const sequenceAtSchedule = state.sequence
        state.stallTimer = setTimeout(() => {
            if (state.terminal || state.sequence !== sequenceAtSchedule) return

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
            setSwapContext(stalledAttributes, { replaceAttributes: true })
            const accepted = captureEvent('swap_lifecycle', stalledAttributes)
            if (accepted) state.sequence = stalledSequence
            state.stallTimer = undefined
        }, stallThreshold)
    }, [])
}
