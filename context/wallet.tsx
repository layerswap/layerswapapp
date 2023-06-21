import React, { FC, useCallback, useState } from 'react'
import { KnownErrorCode } from '../Models/ApiError';
import { Steps } from '../Models/Wizard';
import { AccountInterface } from 'starknet';
import { StarknetWindowObject } from 'get-starknet';

const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);




export type WizardProvider<T> = {
    starknetAccount: StarknetWindowObject,
}

type UpdateInterface<T> = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
}

type Props<T> = {
    children?: JSX.Element | JSX.Element[];
}

export const WalletDatadProvider: FC = <T extends Steps>({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount
            }}>
                {children}
            </WalletStateUpdateContext.Provider>
        </WalletStateContext.Provider >
    );
}


export function useWalletState<T>() {
    const data = React.useContext<WizardProvider<T>>((WalletStateContext as unknown) as React.Context<WizardProvider<T>>);
    if (data === undefined) {
        throw new Error('useWalletStateContext must be used within a WalletStateContext');
    }

    return data;
}

export function useWalletUpdate<T>() {
    const updateFns = React.useContext<UpdateInterface<T>>(WalletStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useWalletStateUpdateContext must be used within a WalletStateUpdateContext');
    }

    return updateFns;
}