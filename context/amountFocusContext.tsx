import React, { Context, createContext, useContext, useState, FC, Dispatch, SetStateAction } from 'react';

type AmountFocusContextType = {
    isAmountFocused: boolean;
    setIsAmountFocused: Dispatch<SetStateAction<boolean>>;
};

const AmountFocusContext = createContext<AmountFocusContextType | null>(null);

export const AmountFocusProvider: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    return (
        <AmountFocusContext.Provider value={{ isAmountFocused, setIsAmountFocused }}>
            {children}
        </AmountFocusContext.Provider>
    );
};

export function useAmountFocus() {
    const context = useContext(AmountFocusContext as Context<AmountFocusContextType>);
    if (!context) {
        throw new Error('useAmountFocus must be used within an AmountFocusProvider');
    }
    return context;
}
