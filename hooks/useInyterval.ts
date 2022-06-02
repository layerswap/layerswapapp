import { useEffect, useRef } from "react"

export function useInterval(callback, dependencies = [], delay = 5000) {
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