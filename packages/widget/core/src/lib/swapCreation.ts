import { ROUTE_VALIDATION_ERROR_CODES } from './routeValidationErrors'
import type { SwapLifecycleEvent } from '@layerswap/widget-types'
import { getErrorOccurrenceId } from '@layerswap/widget-types'
import type { ApiResponse } from '@layerswap/widget-types'
import type { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { ErrorHandler } from '@/lib/ErrorHandler'
import { lifecycleErrorDetails, type SwapLifecycleContext } from './swapLifecycle'

// Swap creation is split into three scopes so that each has one owner:
//  - attempt (createSwapAttempt): emits exactly one of swap_created / swap_creation_failed,
//  - request (requestSwap): the API call and its response guards; the only place that can
//    declare gasless unavailable,
//  - post-creation (announceCreatedSwap): side effects that run once the swap exists and
//    can never fail the attempt.
// context/swap.tsx must not wrap any of this in its own try/catch (tests/swap-creation.test.mjs).

/**
 * Runs after the swap exists. Isolated: a throw is reported via onError
 * (`SideEffectError`) and never rejects the attempt. Return values (including
 * promises) are ignored.
 */
export type SwapCreatedEffect = { name: string; run: (swap: SwapResponse) => void }

export type PreparedSwapRequest = {
    request: () => Promise<ApiResponse<SwapResponse> | undefined>
    /** True iff the request being sent carries use_gasless. */
    useGasless: boolean
    /** Post-creation effects, in order. Built by prepare() because they depend on the same plan as the request. */
    onCreated: ReadonlyArray<SwapCreatedEffect>
}

export type SwapCreationHooks = {
    path: string
    lifecycleContext: SwapLifecycleContext
    onLifecycle: (event: SwapLifecycleEvent) => void
    /** Request scope only: fired for a failed use_gasless request except route/amount validation. */
    onGaslessUnavailable: () => void
}

// These validation failures apply equally to standard transfers. Changing the
// gasless preference cannot fix them and would hide the actionable API error.
function isRouteValidationError(error: unknown): boolean {
    const value = error as { code?: string; response?: { data?: { error?: { code?: string } } } } | undefined
    const code = value?.response?.data?.error?.code ?? value?.code
    return !!code && ROUTE_VALIDATION_ERROR_CODES.has(code)
}

/**
 * Request scope. Route/amount validation errors remain actionable API errors.
 * Other refusals of a gasless request offer fallback; a 2xx without an id does not.
 */
export async function requestSwap(
    { request, useGasless }: Pick<PreparedSwapRequest, 'request' | 'useGasless'>,
    onGaslessUnavailable: () => void,
): Promise<SwapResponse> {
    let response: ApiResponse<SwapResponse> | undefined
    try {
        response = await request()
    } catch (error) {
        if (useGasless && !isRouteValidationError(error)) onGaslessUnavailable()
        throw error
    }
    if (response?.error) {
        if (useGasless && !isRouteValidationError(response.error)) onGaslessUnavailable()
        throw response.error
    }
    const swap = response?.data
    if (!swap?.swap.id) throw new Error('Could not create swap')
    return swap
}

/** Post-creation scope. Synchronous by contract: nothing here can reject the attempt. */
export function announceCreatedSwap(swap: SwapResponse, effects: ReadonlyArray<SwapCreatedEffect>): void {
    for (const effect of effects) {
        try {
            effect.run(swap)
        } catch (caught) {
            const error = caught instanceof Error ? caught : new Error(String(caught))
            ErrorHandler({
                type: 'SideEffectError',
                operation: effect.name,
                swapId: swap.swap.id,
                occurrenceId: getErrorOccurrenceId(caught),
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: caught,
            })
        }
    }
}

/**
 * Attempt scope. Invariants:
 *  (a) exactly one of swap_created / swap_creation_failed per call;
 *  (b) the promise rejects iff swap_creation_failed was emitted;
 *  (c) onGaslessUnavailable fires only from requestSwap;
 *  (d) post-creation effects never affect (a)/(b).
 */
export async function createSwapAttempt(
    prepare: () => Promise<PreparedSwapRequest>,
    hooks: SwapCreationHooks,
): Promise<SwapResponse> {
    const base = { stage: 'swap_creation' as const, path: hooks.path }
    hooks.onLifecycle({ step: 'swap_creation_started', outcome: 'started', ...base, ...hooks.lifecycleContext })
    let prepared: PreparedSwapRequest
    let swap: SwapResponse
    try {
        prepared = await prepare()
        swap = await requestSwap(prepared, hooks.onGaslessUnavailable)
    } catch (error) {
        hooks.onLifecycle({ step: 'swap_creation_failed', outcome: 'failed', ...base, ...lifecycleErrorDetails(error), ...hooks.lifecycleContext })
        throw error
    }
    announceCreatedSwap(swap, [
        {
            name: 'swap_created_lifecycle',
            run: () => hooks.onLifecycle({
                step: 'swap_created',
                outcome: 'succeeded',
                ...base,
                ...hooks.lifecycleContext,
                swapId: swap.swap.id,
                fromAddress: swap.swap.source_address,
                status: swap.swap.status,
            }),
        },
        ...prepared.onCreated,
    ])
    return swap
}
