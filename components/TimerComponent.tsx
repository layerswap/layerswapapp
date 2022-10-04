import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, FC, SetStateAction, Dispatch } from 'react'

type TimerProps = {
    seconds: number
    isStarted: boolean;
    setIsStarted: Dispatch<SetStateAction<boolean>>,
    waitingComponent: (remainigTime: string) => JSX.Element | JSX.Element[]
    children: JSX.Element | JSX.Element[]
}

const Timer: FC<TimerProps> = (({ seconds, isStarted, setIsStarted, waitingComponent, children }, ref) => {
    const [secondsRemaining, setSecondsRemaining] = useState(seconds)
    const twoDigits = (num) => String(num).padStart(2, '0')

    const secondsToDisplay = secondsRemaining % 60
    const minutesRemaining = (secondsRemaining - secondsToDisplay) / 60
    const minutesToDisplay = minutesRemaining % 60

    useInterval(
        () => {
            if (secondsRemaining == 0 && isStarted) {
                setSecondsRemaining(seconds);
            }
            if (secondsRemaining > 0) {
                if (secondsRemaining == 1) {
                    setIsStarted(false)
                }
                setSecondsRemaining(secondsRemaining - 1)
               
            }
        },
        isStarted ? 1000 : null,
        // passing null stops the interval
    )

    return (
        <>
            {
                isStarted ?
                    waitingComponent(`${twoDigits(minutesToDisplay)}:${twoDigits(secondsToDisplay)}`)
                    :
                    children
            }
        </>
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