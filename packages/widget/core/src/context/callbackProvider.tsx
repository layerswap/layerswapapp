import { type SwapLifecycleEvent, type SwapStatusEvent, type WidgetCallbacks } from '@layerswap/widget-types';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { createContext, useContext, ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect'
import { ErrorHandler } from '@/lib/ErrorHandler'
import { widgetTelemetry } from '@/lib/widgetTelemetry'
import { createCallbackObservations } from '@/lib/callbackObservations'
import { createSwapStatusObserver } from '@/lib/swapStatusObserver'


export interface CallbacksContextType extends Omit<WidgetCallbacks, 'onFormChange' | 'onSwapCreate' | 'onSwapComplete'> {
    onFormChange?: (formData: SwapFormValues) => void
    onSwapCreate?: (swapData: SwapResponse) => void
    onSwapComplete?: (swapData: SwapResponse) => void
}

export interface CallbackProviderProps {
    children: ReactNode
    callbacks?: CallbacksContextType
}

type CallbackContextValue = Required<Omit<CallbacksContextType, 'onError'>>
const CallbackContext = createContext<CallbackContextValue | undefined>(undefined)

function reportCallbackError(caught: unknown) {
    const error = caught instanceof Error ? caught : new Error(String(caught))
    ErrorHandler({
        type: 'CallbackError',
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: caught,
    })
}

export function CallbackProvider({ children, callbacks }: CallbackProviderProps) {
    const [observations] = useState(createCallbackObservations)
    const [backendStatuses] = useState(createSwapStatusObserver)
    const callbacksRef = useRef(callbacks)
    useClientLayoutEffect(() => { callbacksRef.current = callbacks }, [callbacks])

    // Status/lifecycle effects must not rerun just because a host replaces its callbacks.
    const onSwapStatusChange = useCallback((event: SwapStatusEvent) => {
        if (!backendStatuses.observe(event)) return
        try { callbacksRef.current?.onSwapStatusChange?.(event) } catch (error) { reportCallbackError(error) }
    }, [backendStatuses])
    const onSwapLifecycle = useCallback((event: SwapLifecycleEvent) => {
        // Creation is an explicit operation result. Wallet prompts/phase observations never
        // establish or reset backend history.
        if (event.step === 'swap_created' && event.swapId) backendStatuses.created(event.swapId)
        widgetTelemetry.lifecycle(event)
        if (!observations.lifecycle(event)) return
        try { callbacksRef.current?.onSwapLifecycle?.(event) } catch (error) { reportCallbackError(error) }
    }, [observations, backendStatuses])

    const telemetryRef = useRef(callbacks?.onTelemetry)
    useClientLayoutEffect(() => { telemetryRef.current = callbacks?.onTelemetry }, [callbacks?.onTelemetry])
    const telemetryEnabled = !!callbacks?.onTelemetry
    useClientLayoutEffect(() => widgetTelemetry.register(telemetryEnabled
        ? event => telemetryRef.current?.(event) : undefined), [telemetryEnabled])
    const value = useMemo<CallbackContextValue>(() => {
        return {
            onTelemetry: event => { try { callbacks?.onTelemetry?.(event) } catch { /* optional telemetry */ } },
            onFormChange: (formData: SwapFormValues) => { try { callbacks?.onFormChange?.(formData) } catch (error) { reportCallbackError(error) } },
            onSwapCreate: (swapData: SwapResponse) => {
                backendStatuses.created(swapData.swap.id)
                try { callbacks?.onSwapCreate?.(swapData) } catch (error) { reportCallbackError(error) }
            },
            onSwapComplete: (swapData: SwapResponse) => { try { callbacks?.onSwapComplete?.(swapData) } catch (error) { reportCallbackError(error) } },
            onSwapModalStateChange: (open: boolean) => {
                if (open) observations.reset()
                try { callbacks?.onSwapModalStateChange?.(open) } catch (error) { reportCallbackError(error) }
            },
            onBackClick: () => {
                observations.reset()
                try { callbacks?.onBackClick?.() } catch (error) { reportCallbackError(error) }
            },
            onSwapStatusChange,
            onSwapLifecycle,
            onMenuNavigationChange: (path: string) => { try { callbacks?.onMenuNavigationChange?.(path) } catch (error) { reportCallbackError(error) } },
        }
    }, [callbacks, onSwapStatusChange, onSwapLifecycle, observations, backendStatuses])
    return (
        <CallbackContext.Provider value={value}>
            {children}
        </CallbackContext.Provider>
    )
}

export function useCallbacks(): CallbackContextValue {
    const context = useContext(CallbackContext)
    if (!context) {
        throw new Error('useCallbacks must be used within a CallbackProvider')
    }
    return context
}
