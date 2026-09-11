import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import type { SwapFormValues } from './SwapFormValues'
import { widgetTelemetry } from '@/lib/widgetTelemetry'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Owns the pre-submit flow independently from the existing swap lifecycle. */
export default function FormTelemetry({ mode }: { mode: string }) {
    const { values } = useFormikContext<SwapFormValues>()
    const current = useRef<ReturnType<typeof widgetTelemetry.createFlow> | null>(null)
    current.current ??= widgetTelemetry.createFlow({ form_mode: mode })
    const flow = current.current
    const source = values.from?.name
    const destination = values.to?.name
    const sourceToken = values.fromAsset?.symbol
    const destinationToken = values.toAsset?.symbol
    const method = values.depositMethod
    useClientLayoutEffect(() => {
        widgetTelemetry.update(flow, { form_mode: mode, source_network: source, destination_network: destination,
            source_token: sourceToken, destination_token: destinationToken, deposit_method: method })
    }, [flow, mode, source, destination, sourceToken, destinationToken, method])
    useClientLayoutEffect(() => widgetTelemetry.mount(flow), [flow])
    return null
}
