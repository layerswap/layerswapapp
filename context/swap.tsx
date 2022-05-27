import React from 'react'

const SwapDataStateContext = React.createContext<any>(null);
const SwapDataUpdateContext = React.createContext<any>(null);


export function SwapDataProvider({ children }) {
    const [swapData, setSwapData] = React.useState({});

    const updateFns = {
        updateSwap:(data) => {
            setSwapData(data)
        }
    };
 
    return (
        <SwapDataStateContext.Provider value={swapData}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = React.useContext(SwapDataStateContext);

    if (data === undefined) {
        throw new Error('useSwapState must be used within a SwapStateProvider');
    }

    return data;
}

export function useSwapDataUpdate() {
    const updateFns = React.useContext(SwapDataUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}