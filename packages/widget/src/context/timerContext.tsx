import { Context, useCallback, createContext, useContext, useState } from 'react'
import { useInterval } from '../hooks/useInterval';

const TimerStateContext = createContext<DataContextType | null>(null);


type DataContextType = {
    started: boolean;
    secondsRemaining: number | undefined;
    start: (seconds: number) => void,
}

export function TimerProvider({ children }) {

    const [secondsRemaining, setSecondsRemaining] = useState<number>()
    const [started, setStarted] = useState(false)

    const start = useCallback((seconds: number) => {
        setSecondsRemaining(seconds)
        setStarted(true)
    }, [])

    const callback = useCallback(() => {
        if (Number(secondsRemaining) > 0) {
            if (secondsRemaining == 1) {
                setStarted(false)
            }
            setSecondsRemaining(Number(secondsRemaining) - 1)

        }
    }, [secondsRemaining])

    useInterval(
        callback,
        started ? 1000 : null,
    )

    return (
        <TimerStateContext.Provider value={{ started, secondsRemaining, start }}>
            {children}
        </TimerStateContext.Provider>
    )
}

export function useTimerState() {
    const data = useContext<DataContextType>(TimerStateContext as Context<DataContextType>);

    if (data === undefined) {
        throw new Error('useTimerState must be used within a MenuStateProvider');
    }

    return data;
}

