import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { createContext, useContext, ReactNode, useCallback } from 'react'

export interface CallbacksContextType {
    onFormChange?: (formData: SwapFormValues) => void
    onSwapCreate?: (swapData: SwapResponse) => void
    onSwapComplete?: (swapData: SwapResponse) => void
    onSwapModalStateChange?: (open: boolean) => void
    onBackClick?: () => void
    onError?: (error: any) => void
}

export interface CallbackProviderProps {
    children: ReactNode
    callbacks?: CallbacksContextType
}

const CallbackContext = createContext<CallbacksContextType>({})

export function CallbackProvider({ children, callbacks = {} }: CallbackProviderProps) {
    return (
        <CallbackContext.Provider value={callbacks}>
            {children}
        </CallbackContext.Provider>
    )
}

export function useCallbacks() {
    const context = useContext(CallbackContext)
    return context
}

export function useFormChangeCallback() {
    const { onFormChange } = useCallbacks()

    return useCallback((formData: SwapFormValues) => {
        if (onFormChange) {
            onFormChange(formData)
        }
    }, [onFormChange])
}

export function useSwapCreateCallback() {
    const { onSwapCreate } = useCallbacks()

    return useCallback((swapData: SwapResponse) => {
        if (onSwapCreate) {
            onSwapCreate(swapData)
        }
    }, [onSwapCreate])
}

export function useSwapCompleteCallback() {
    const { onSwapComplete } = useCallbacks()

    return useCallback((swapData: SwapResponse) => {
        if (onSwapComplete) {
            onSwapComplete(swapData)
        }
    }, [onSwapComplete])
}

export function useSwapModalStateChangeCallback() {
    const { onSwapModalStateChange } = useCallbacks()

    return useCallback((open: boolean) => {
        if (onSwapModalStateChange) {
            onSwapModalStateChange(open)
        }
    }, [onSwapModalStateChange])
}

export function useBackClickCallback() {
    const { onBackClick } = useCallbacks()

    return useCallback(() => {
        if (onBackClick) {
            onBackClick()
        }
    }, [onBackClick])
}

export function useErrorCallback() {
    const { onError } = useCallbacks()

    return useCallback((error: any) => {
        if (onError) {
            onError(error)
        }
    }, [onError])
}