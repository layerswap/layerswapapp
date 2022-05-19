import React from 'react'

const UserExchangeStateContext = React.createContext<any>(null);
const UserExchangeDataUpdateContext = React.createContext<any>(null);


export function UserExchangeProvider({ children }) {
    const [exchangeData, setUserExchangeData] = React.useState({});

    const updateFns = {
        updateUserExchange: (data) => {
            setUserExchangeData(data)
        }
    };

    return (
        <UserExchangeStateContext.Provider value={{ exchangeData }}>
            <UserExchangeDataUpdateContext.Provider value={updateFns}>
                {children}
            </UserExchangeDataUpdateContext.Provider>
        </UserExchangeStateContext.Provider>
    );
}

export function useUserExchangeState() {
    const data = React.useContext(UserExchangeStateContext);

    if (data === undefined) {
        throw new Error('useUserExchangeState must be used within a UserExchangeStateProvider');
    }

    return data;
}


export function useUserExchangeDataUpdate() {
    const updateFns = React.useContext(UserExchangeDataUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useUserExchangeDataUpdate must be used within a UserExchangeDataProvider');
    }

    return updateFns;
}