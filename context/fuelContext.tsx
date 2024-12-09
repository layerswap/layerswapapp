import { Context, Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';
import { Wallet } from '../Models/WalletProvider';

type FuelState = {
    connectedWallets: Wallet[] | undefined;
    setConnectedWallets: Dispatch<SetStateAction<Wallet[] | undefined>>
}

export const FuelContext = createContext<FuelState | undefined>(undefined);

export const FuelConnectedWalletsProvider: FC<{ children?: ReactNode }> = ({ children }) => {
    const [connectedWallets, setConnectedWallets] = useState<Wallet[] | undefined>([])

    const contextValue: FuelState = {
        connectedWallets,
        setConnectedWallets
    };

    return (
        <FuelContext.Provider value={contextValue}>
            {children}
        </FuelContext.Provider>
    );
};

export function useFuelState() {
    const data = useContext(FuelContext as Context<FuelState>);

    if (data === null) {
        throw new Error('useFuelState must be used within a FuelConnectedWalletsProvider');
    }

    return data;
}