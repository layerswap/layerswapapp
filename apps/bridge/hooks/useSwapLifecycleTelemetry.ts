import { useRef } from 'react'
import { useClientLayoutEffect } from '@layerswap/widget/internal'
import { captureEvent, setSwapContext } from '../lib/faro'
import { createSwapLifecycleTelemetry } from '../lib/faro-swap-lifecycle'

export function useSwapLifecycleTelemetry() {
    const controllerRef = useRef<ReturnType<typeof createSwapLifecycleTelemetry> | null>(null)
    controllerRef.current ??= createSwapLifecycleTelemetry({ captureEvent, setSwapContext })
    const controller = controllerRef.current

    // Resume before child passive effects replay in React StrictMode, and let
    // that replay's cleanup fall through without erasing the live journey.
    useClientLayoutEffect(() => {
        controller.resume()
        return () => controller.scheduleDispose()
    }, [controller])

    return controller
}
