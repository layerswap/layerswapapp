import { useEffect, useRef } from "react"

export function useInterval(callback, dependencies = [], delay = 50000) {
    const timeoutIdRef = useRef(null)
    useEffect(() => {
        // Side note: preceding semicolon needed for IIFEs.
        ; (async function pollingCallback() {
            try {
                await callback()
            } finally {
                // Initiate timeout only after a response/error is received
                timeoutIdRef.current = setTimeout(
                    pollingCallback,
                    delay
                )
            }
        })()
        return () => clearTimeout(timeoutIdRef.current)
    }, [...dependencies, delay])
}


export function useStartInterval(callback, dependencies = [], delay = 50000) {
    const timeoutIdRef = useRef(null)
    useEffect(() => {
        let _stopped = false
            // Side note: preceding semicolon needed for IIFEs.
            ; (async function pollingCallback() {
                try {
                    await callback()
                } finally {
                    // Initiate timeout only after a response/error is received
                    timeoutIdRef.current = !_stopped && setTimeout(
                        pollingCallback,
                        delay
                    )
                }
            })()
        return () => {
            _stopped = true // prevent racing conditions
            clearTimeout(timeoutIdRef.current)
        }
    }, [...dependencies, delay])
}