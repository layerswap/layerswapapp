import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useState, useContext, Context, useCallback } from 'react'

const LoadingStateContext = createContext<ContextType | null>(null);
type Reg = {
    started?: boolean,
    ended?: boolean
}
type ContextType = {
    start: (name: string) => void,
    end: (name: string) => void,
    isLoading: boolean
}

export function LoadingProvider({ children }) {
    const [regs, setReg] = useState<{ [key: string]: Reg }>({})

    const start = (name: string) => {
        setReg(r => ({ ...r, [name]: { started: true } }))
    }
    const end = (name: string) => {
        setReg(r => ({ ...r, [name]: { ended: true } }))
    }
    const isLoading = Object.values(regs).some(r => r.started && !r.ended)
    return (
        <LoadingStateContext.Provider value={{ start, end, isLoading }}>
            <AnimatePresence>
                {children}
            </AnimatePresence>
        </LoadingStateContext.Provider>
    )
}

export function useLoadingState() {
    const data = useContext<ContextType>(LoadingStateContext as Context<ContextType>);

    if (data === undefined) {
        throw new Error('useLoadingState must be used within a LoadingStateProvider');
    }

    return data;
}
