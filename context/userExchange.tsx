import React from 'react'
import LayerSwapApiClient, { UserExchangesResponse } from '../lib/layerSwapApiClient';

const UserExchangeStateContext = React.createContext<any>(null);
const UserExchangeDataUpdateContext = React.createContext<any>(null);

type UpdateFns = {
    getUserExchanges: (token: string) => Promise<UserExchangesResponse>
}

export function UserExchangeProvider({ children }) {
    const [exchangeData, setUserExchangeData] = React.useState({});

    const layerswapApiClient = new LayerSwapApiClient()

    const updateFns: UpdateFns = {
        getUserExchanges: async (token: string): Promise<UserExchangesResponse> => {
            const res = await layerswapApiClient.GetExchangeAccounts(token)
            setUserExchangeData(res)
            return res;
        }
    };

    return (
        <UserExchangeStateContext.Provider value={exchangeData}>
            <UserExchangeDataUpdateContext.Provider value={updateFns}>
                {children}
            </UserExchangeDataUpdateContext.Provider>
        </UserExchangeStateContext.Provider>
    );
}

export function useUserExchangeState() {
    const data = React.useContext<UserExchangesResponse>(UserExchangeStateContext);

    if (data === undefined) {
        throw new Error('useUserExchangeState must be used within a UserExchangeStateProvider');
    }

    return data;
}


export function useUserExchangeDataUpdate() {
    const updateFns = React.useContext<UpdateFns>(UserExchangeDataUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useUserExchangeDataUpdate must be used within a UserExchangeDataProvider');
    }

    return updateFns;
}