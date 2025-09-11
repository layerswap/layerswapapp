import React, { FC } from 'react'

type WithdrawalContextValue = {
    onWithdrawalSuccess?: () => void;
}

const WithdrawalContext = React.createContext<WithdrawalContextValue | null>(null);

export const WithdrawalProvider: FC<{ onWithdrawalSuccess?: () => void, children?: React.ReactNode }> = ({ onWithdrawalSuccess, children }) => {
    return (
        <WithdrawalContext.Provider value={{ onWithdrawalSuccess }}>
            {children}
        </WithdrawalContext.Provider>
    );
}

export function useWithdrawal() {
    const data = React.useContext(WithdrawalContext);

    if (data === null) {
        throw new Error('useWithdrawal must be used within a WithdrawalProvider');
    }

    return data;
}
