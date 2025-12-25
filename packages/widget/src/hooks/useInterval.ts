import { useEffect, useRef, useState } from "react"

export function useComplexInterval(callback: () => Promise<boolean>, dependencies: any[] = [], delay: number = 50000) {
    const timeoutIdRef = useRef<any>(null)

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

export function useInterval(callback, delay) {
    const savedCallback = useRef<any>(undefined)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        function tick() {
            typeof savedCallback.current === "function" && savedCallback.current()
        }
        if (delay !== null) {
            let id = setInterval(tick, delay)
            return () => clearInterval(id)
        }
    }, [delay])
}



export function useDelayedInterval(callback: () => Promise<boolean>, dependencies: any[] = [], delay: number = 50000) {
    const timeoutIdRef = useRef<any>(null)
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
