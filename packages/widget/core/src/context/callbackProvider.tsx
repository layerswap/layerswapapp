import { type ErrorEventType, type SwapLifecycleEvent, type SwapStatusEvent } from '@layerswap/widget-types';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { createContext, useContext, ReactNode, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { ErrorHandler } from '@/lib/ErrorHandler'
import { reportErrorLoggerFailure } from '@/stores/logStore'
import type { WidgetTelemetryHandler } from '@layerswap/widget-types'
import { widgetTelemetry } from '@/lib/widgetTelemetry'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface CallbacksContextType {
    onTelemetry?: WidgetTelemetryHandler
    onFormChange?: (formData: SwapFormValues) => void
    onSwapCreate?: (swapData: SwapResponse) => void
    onSwapComplete?: (swapData: SwapResponse) => void
    onSwapModalStateChange?: (open: boolean) => void
    onBackClick?: () => void
    onError?: (error: ErrorEventType) => void
    onSwapStatusChange?: (event: SwapStatusEvent) => void
    onSwapLifecycle?: (event: SwapLifecycleEvent) => void
    onMenuNavigationChange?: (path: string) => void
}

export interface CallbackProviderProps {
    children: ReactNode
    callbacks?: CallbacksContextType
}

const CallbackContext = createContext<Required<CallbacksContextType> | undefined>(undefined)

export function CallbackProvider({ children, callbacks }: CallbackProviderProps) {
    const callbacksRef = useRef(callbacks)
    useClientLayoutEffect(() => { callbacksRef.current = callbacks }, [callbacks])

    // Status/lifecycle effects must not rerun just because a host replaces its callbacks.
    const onSwapStatusChange = useCallback((event: SwapStatusEvent) => {
        try { callbacksRef.current?.onSwapStatusChange?.(event) } catch (error) { ErrorHandler(error) }
    }, [])
    const onSwapLifecycle = useCallback((event: SwapLifecycleEvent) => {
        widgetTelemetry.lifecycle(event)
        try { callbacksRef.current?.onSwapLifecycle?.(event) } catch (error) { ErrorHandler(error) }
    }, [])

    const telemetryRef = useRef(callbacks?.onTelemetry)
    useClientLayoutEffect(() => { telemetryRef.current = callbacks?.onTelemetry }, [callbacks?.onTelemetry])
    const telemetryEnabled = !!callbacks?.onTelemetry
    useClientLayoutEffect(() => widgetTelemetry.register(telemetryEnabled
        ? event => telemetryRef.current?.(event) : undefined), [telemetryEnabled])
    const value = useMemo<Required<CallbacksContextType>>(() => {
        return {
            onTelemetry: event => { try { callbacks?.onTelemetry?.(event) } catch { /* optional telemetry */ } },
            onFormChange: (formData: SwapFormValues) => { try { callbacks?.onFormChange?.(formData) } catch (error) { ErrorHandler(error) } },
            onSwapCreate: (swapData: SwapResponse) => { try { callbacks?.onSwapCreate?.(swapData) } catch (error) { ErrorHandler(error) } },
            onSwapComplete: (swapData: SwapResponse) => { try { callbacks?.onSwapComplete?.(swapData) } catch (error) { ErrorHandler(error) } },
            onSwapModalStateChange: (open: boolean) => { try { callbacks?.onSwapModalStateChange?.(open) } catch (error) { ErrorHandler(error) } },
            onBackClick: () => { try { callbacks?.onBackClick?.() } catch (error) { ErrorHandler(error) } },
            onError: (event: ErrorEventType) => {
                try {
                    callbacks?.onError?.(event)
                }
                catch (error) {
                    reportErrorLoggerFailure(event, error)
                }
            },
            onSwapStatusChange,
            onSwapLifecycle,
            onMenuNavigationChange: (path: string) => { try { callbacks?.onMenuNavigationChange?.(path) } catch (error) { ErrorHandler(error) } },
        }
    }, [callbacks, onSwapStatusChange, onSwapLifecycle])
    return (
        <CallbackContext.Provider value={value}>
            {children}
        </CallbackContext.Provider>
    )
}

export function useCallbacks(): Required<CallbacksContextType> {
    const context = useContext(CallbackContext)
    if (!context) {
        throw new Error('useCallbacks must be used within a CallbackProvider')
    }
    return context
}
