import { createContext, useState, useContext } from 'react'
import { SwapResponse } from '../lib/layerSwapApiClient';

const HistoryStateContext = createContext<ContextType | null>(null);

type ContextType = {
    selectedSwap: SwapResponse | undefined,
    setSelectedSwap: (swap: SwapResponse | undefined) => void,
}

export function HistorySwapProvider({ children }) {

    const [swap, setSwap] = useState<SwapResponse | undefined>()

    return (
        <HistoryStateContext.Provider value={{
            selectedSwap: swap,
            setSelectedSwap: setSwap
        }}>
            {children}
        </HistoryStateContext.Provider>
    )
}

export function useHistoryContext() {
    const data = useContext(HistoryStateContext);

    if (data === null) {
        throw new Error('useHistoryContext must be used within a HistorySwapProvider');
    }

    return data;
}
