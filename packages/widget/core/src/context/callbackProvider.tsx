import { type ErrorEventType, type SwapLifecycleEvent, type SwapStatusEvent } from '@layerswap/widget-types';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { createContext, useContext, ReactNode, useMemo } from 'react'
import { ErrorHandler } from '@/lib/ErrorHandler'
import { reportErrorLoggerFailure } from '@/stores/logStore'

export interface CallbacksContextType {
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
    const value = useMemo<Required<CallbacksContextType>>(() => {
        return {
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
            onSwapStatusChange: (event: SwapStatusEvent) => { try { callbacks?.onSwapStatusChange?.(event) } catch (error) { ErrorHandler(error) } },
            onSwapLifecycle: (event: SwapLifecycleEvent) => { try { callbacks?.onSwapLifecycle?.(event) } catch (error) { ErrorHandler(error) } },
            onMenuNavigationChange: (path: string) => { try { callbacks?.onMenuNavigationChange?.(path) } catch (error) { ErrorHandler(error) } },
        }
    }, [callbacks])
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
