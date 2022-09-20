import { useEffect, useRef, useState } from "react"

export function useInterval(callback: () => Promise<boolean>, dependencies: any[] = [], delay: number = 50000) {
    const timeoutIdRef = useRef(null)

    useEffect(() => {
        //for race conditions
        let _stopped = false
            // Side note: preceding semicolon needed for IIFEs.
            ; (async function pollingCallback() {
                try {
                    if (await callback()) {
                        _stopped = true;
                    }
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

export function useDelayedInterval(callback: () => Promise<boolean>, dependencies: any[] = [], delay: number = 50000) {
    const timeoutIdRef = useRef(null)
    const [started, setStarted] = useState(false)
    const handleStart = () => {
        setStarted(true)
    }
    useEffect(() => {
        if (!started)
            return
        //for race conditions
        let _stopped = false
            // Side note: preceding semicolon needed for IIFEs.
            ; (async function pollingCallback() {
                try {
                    if (await callback()) {
                        _stopped = true;
                        setStarted(false)
                    }
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
            setStarted(false)
        }
    }, [...dependencies, delay, started])

    return { startInterval: handleStart }
}
