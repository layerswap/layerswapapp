import type { SwapLifecycleEvent, WidgetTelemetryEvent, WidgetTelemetryHandler } from '@layerswap/widget-types'

type Attributes = WidgetTelemetryEvent['attributes']
type Flow = {
    id: string; started: number; attributes: Attributes; opened: boolean; engaged: boolean;
    submitted: boolean; prompted: boolean; transferSubmitted: boolean; deposited: boolean; completed: boolean;
    attempts: number; swapId?: string; validation?: string;
}

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const now = () => globalThis.performance?.now() ?? Date.now()

/** One live widget is enforced by LayerswapProvider. Kept factory-based for isolation tests. */
export function createWidgetTelemetry(clock = now, wallClock = Date.now) {
    let registration: { handler: WidgetTelemetryHandler; active: boolean } | undefined
    let flow: Flow | undefined
    const emit = (owner: typeof registration, name: WidgetTelemetryEvent['name'], attributes: Attributes) => {
        if (!owner?.active) return
        try { owner.handler({ name, attributes: { schema_version: 1, event_id: id(), ...attributes } }) }
        catch { /* An optional analytics callback must never affect a wallet or API operation. */ }
    }
    const snapshot = (current = flow): Attributes => current ? {
        ...current.attributes, flow_id: current.id, flow_started_ms: current.started,
        flow_elapsed_ms: Math.max(0, wallClock() - current.started),
        form_started: current.engaged, submitted: current.submitted, transfer_prompted: current.prompted,
        transfer_submitted: current.transferSubmitted, deposit_observed: current.deposited,
        completion_observed: current.completed, submission_count: current.attempts, swap_id: current.swapId,
    } : {}
    const progress = (step: string, extra: Attributes = {}) => emit(registration, 'widget_flow', { ...snapshot(), step, ...extra })
    const open = () => {
        if (!flow || flow.opened || !registration?.active) return
        flow.opened = true
        progress('form_viewed')
    }
    return {
        register(handler?: WidgetTelemetryHandler) {
            if (registration) registration.active = false
            const owner = handler ? { handler, active: true } : undefined
            registration = owner
            return () => {
                if (owner) owner.active = false
                if (registration === owner) registration = undefined
            }
        },
        createFlow(attributes: Attributes): Flow {
            return { id: id(), started: wallClock(), attributes, opened: false, engaged: false,
                submitted: false, prompted: false, transferSubmitted: false, deposited: false, completed: false, attempts: 0 }
        },
        mount(current: Flow) {
            flow = current
            // Parent registration and StrictMode layout-effect replay finish before this runs.
            queueMicrotask(() => { if (flow === current) open() })
            return () => { if (flow === current) flow = undefined }
        },
        update(current: Flow, attributes: Attributes) { current.attributes = { ...attributes } },
        interaction(action: string, trigger: string, inForm: boolean, attributes: Attributes = {}) {
            open()
            const alreadyEngaged = flow?.engaged
            if (flow && inForm && !flow.engaged) {
                flow.engaged = true
                progress('form_started')
                if (flow.validation) progress('validation_shown', { reason_code: flow.validation })
            }
            // Text editing starts a flow once. Never emit every keystroke.
            if (action === 'form_edited' && alreadyEngaged) return
            emit(registration, 'widget_interaction', { ...snapshot(), ...attributes, action, trigger })
        },
        validation(code?: string) {
            if (!flow || flow.validation === code) return
            flow.validation = code
            if (flow.engaged && code) progress('validation_shown', { reason_code: code })
        },
        lifecycle(event: SwapLifecycleEvent) {
            if (!flow || event.step === 'flow_error') return
            if (event.step === 'swap_created' && !flow.submitted) return
            // A revisited/late swap must not complete the currently edited form.
            if (event.swapId && event.swapId !== flow.swapId && event.step !== 'swap_created') return
            open()
            if (event.step === 'form_submitted') {
                flow.submitted = true
                flow.attempts++
            }
            if (event.step === 'swap_created') flow.swapId = event.swapId
            if (event.step === 'wallet_prompt_opened') flow.prompted = true
            if (event.step === 'transaction_submitted' || event.step === 'gasless_authorization_submitted') flow.transferSubmitted = true
            if (event.step === 'input_transaction_detected' || event.step === 'input_transfer_confirmed') flow.deposited = true
            if (event.step === 'swap_completed') flow.completed = true
            progress(event.step, { outcome: event.outcome, reason_code: event.reasonCode, occurrence_id: event.occurrenceId })
        },
        beginOperation(operation: string, attributes: Attributes = {}) {
            const owner = registration
            if (!owner?.active) return (_outcome: string, _extra?: Attributes) => {}
            const context = { ...snapshot(), ...attributes, operation, operation_id: id() }
            const started = clock()
            let finished = false
            // Only completion is emitted: polling must not double the number of records.
            return (outcome: string, extra: Attributes = {}) => {
                if (finished) return
                finished = true
                emit(owner, 'widget_operation', { ...context, ...extra, outcome, duration_ms: Math.max(0, clock() - started) })
            }
        },
    }
}

export const widgetTelemetry = createWidgetTelemetry()

export function startApiOperation(method: string, endpoint: string) {
    const [path] = endpoint.split('?')
    const operation = path === '/quote' ? 'quote_request' : path === '/detailed_quote' ? 'detailed_quote_request'
        : path === '/limits' ? 'limits_request' : path === '/swaps' && method === 'POST' ? 'swap_creation'
        : /^\/swaps\/[^/]+\/deposit_actions$/.test(path) ? 'deposit_actions' : undefined
    if (!operation) return (_outcome: string, _extra?: Attributes) => {}
    return widgetTelemetry.beginOperation(operation)
}

/** Activated controls only: native click also covers keyboard and touch activation. */
export function captureWidgetInteraction(event: { target: EventTarget | null; type: string; nativeEvent?: { isTrusted?: boolean } }) {
    if (event.nativeEvent?.isTrusted === false || typeof Element === 'undefined' || !(event.target instanceof Element)) return
    const element = event.target.closest('[data-ls-action],[data-attr]')
    if (element?.matches(':disabled,[aria-disabled="true"]')) return
    const inForm = !!event.target.closest('[data-ls-form]')
    const knownActions: Record<string, string> = {
        'connect-wallet': 'connect_wallet', 'submit-swap': 'submit_swap', 'from-route-picker': 'open_source_picker',
        'to-route-picker': 'open_destination_picker', 'from-cex-picker': 'open_exchange_picker',
        'min-amount': 'set_min_amount', 'half-amount': 'set_half_amount', 'max-amount': 'set_max_amount',
        'see-swap-details': 'toggle_fee_details', 'see-deposit-details': 'toggle_deposit_details',
        'edit-slippage': 'edit_slippage', 'add-address': 'add_address', 'address-item': 'select_address',
    }
    const action = event.type === 'change' ? (inForm ? 'form_edited' : undefined)
        : element?.getAttribute('data-ls-action') ?? knownActions[element?.getAttribute('data-attr') ?? '']
    if (action && /^[a-z][a-z0-9_]{0,63}$/.test(action)) widgetTelemetry.interaction(action, event.type, inForm)
}
