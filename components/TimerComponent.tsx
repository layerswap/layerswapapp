import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

export type TimerRef = {
    start: () => void;
    stop: () => void;
    reset: () => void;
    status: string
}
type TimerProps = {
    seconds: number
}

const Timer = forwardRef<TimerRef, TimerProps>(({ seconds }, ref) => {
    const STATUS = {
        STARTED: 'Started',
        STOPPED: 'Stopped',
    }
    const [secondsRemaining, setSecondsRemaining] = useState(seconds)
    const [status, setStatus] = useState(STATUS.STOPPED)
    const twoDigits = (num) => String(num).padStart(2, '0')

    const secondsToDisplay = secondsRemaining % 60
    const minutesRemaining = (secondsRemaining - secondsToDisplay) / 60
    const minutesToDisplay = minutesRemaining % 60

    const handleStart = () => {
        setStatus(STATUS.STARTED)
    }
    const handleStop = () => {
        setStatus(STATUS.STOPPED)
    }
    const handleReset = () => {
        setStatus(STATUS.STOPPED)
        setSecondsRemaining(seconds)
    }
    useImperativeHandle(ref, () => ({
        start: handleStart,
        stop: handleStop,
        reset: handleReset,
        status: status
    }), []);

    useInterval(
        () => {
            if (secondsRemaining > 0) {
                setSecondsRemaining(secondsRemaining - 1)
            } else {
                setStatus(STATUS.STOPPED)
            }
        },
        status === STATUS.STARTED ? 1000 : null,
        // passing null stops the interval
    )

    return (
        <div className="">
            {twoDigits(minutesToDisplay)}:
            {twoDigits(secondsToDisplay)}
        </div>
    )
})

function useInterval(callback, delay) {
    const savedCallback = useRef(undefined)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        function tick() {
            savedCallback.current()
        }
        if (delay !== null) {
            let id = setInterval(tick, delay)
            return () => clearInterval(id)
        }
    }, [delay])
}

export default Timer